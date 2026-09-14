import type { HistoryMode } from "../location/index.js";
import { createChannel, protectChannel } from "../observable/index.js";
import { areListsEqual, areSlicesEqual, type Query } from "../query/index.js";
import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import {
  type DecodedQuery,
  decodeQuery,
  type QueryIssue,
  readOpenView,
} from "../wire/index.js";
import isCarryingQuery from "./isCarryingQuery.js";
import placeView from "./placeView.js";
import spellLocation from "./spellLocation.js";
import type { LocationSync, LocationSyncConfig, Transition } from "./types.js";

/**
 * Two queries the location cannot tell apart. Every window member the
 * grammar spells is compared; `collapsed` is not, because it has no spelling
 * — collapsing a group must not provoke a write of the same URL.
 */
const isSameQuery = (a: Query, b: Query): boolean =>
  (a.slice === b.slice || areSlicesEqual(a.slice, b.slice)) &&
  a.window.page === b.window.page &&
  a.window.size === b.window.size &&
  a.window.cursor === b.window.cursor;

const areIssuesEqual = (
  a: readonly QueryIssue[],
  b: readonly QueryIssue[],
): boolean =>
  areListsEqual(
    a,
    b,
    (issue, other) =>
      issue.parameter === other.parameter &&
      issue.code === other.code &&
      issue.reason === other.reason,
  );

/**
 * Keep a location and the host's query in step.
 *
 * There is one authoritative query and it lives in the location: the host never
 * mirrors it with an effect of its own. The loop is driven by the transitions
 * the host announces, each carrying its history mode: one with a mode is
 * spelled and, where the location says otherwise, written in that mode, then
 * read back; the location's notification of that very spelling is the loop's
 * own echo and stops. Any other notification is read — its refusals reported
 * with their codes, its query adopted if it differs, its spelling made
 * canonical in place — and an adoption is never written back. A transition
 * other than a reset, over the query the location already decodes to, respells
 * only the view's parameter, so a refused clause the location carries stays.
 * What the query the provider stands on was refused for when it was built stays
 * reported while neither that query nor the location has moved since. On
 * `observe()` the location is read — or the newest write still awaited over it
 * — before anything else runs, so the first request a provider issues is the
 * location's query and never the snapshot's query followed by a second fetch.
 * Everything that touches the URL goes through the location port: the loop
 * never reads the browser, and how a write enters history is the port's to
 * carry out.
 *
 * One sync owns one host: two syncs on the same host both write every
 * transition.
 *
 * @note Impure by design: observing subscribes to the location and the
 * host, and the loop writes the location; that is what the port is for.
 */
export default function syncLocation<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(config: LocationSyncConfig<TFields, TRow>): LocationSync {
  const { host, location, keepsViews } = config;
  const { schema } = host.collection;
  const issues = createChannel<readonly QueryIssue[]>(config.issues, {
    equals: areIssuesEqual,
  });
  /**
   * The spellings of the loop's own writes whose echo it has not heard, oldest
   * first. Writes land in the order they were made, so a notification matching
   * one lands it and every one before it; a write that moves the location to
   * its spelling at once leaves only itself awaited, and only the newest copy
   * of a write that throws without landing is forgotten. When the loop listens
   * again, a location showing one of them lands every one before it, and that
   * one stays awaited, for a location that shows a write at once and notifies
   * of it later. Emptied when the location moves elsewhere, so a later return
   * to a spelling — Forward after Back — is read like any other move, and when
   * an observation starts over a location that moved, since the last release,
   * to a spelling none of them shows.
   */
  let awaited: string[] = [];
  /**
   * Where the location stood when the loop was last released, or null before
   * its first release. An observation starting over the very same spelling
   * keeps the writes still awaited, less those made before the one the location
   * shows.
   */
  let releasedAt: string | null = null;
  /**
   * The last transition the loop heard. A reset announced while nothing
   * observed is one the loop never heard, and the next observation writes
   * it over the location; one it heard was written as it was heard — or
   * threw then, and is not retried — and a location moved since, by Back
   * or a bookmark, is the reader's to keep. A transition announced while an
   * observation's first pass runs is written once the loop listens, as the
   * host then stands.
   */
  let heard: Transition | null = null;
  /**
   * What the host's query was refused for when the provider read it, kept while
   * neither the provider's query nor the location has moved since: a spelling
   * the loop writes of that query leaves the refused clauses out, so reading it
   * back cannot report them. Null once the provider's query or the location
   * moves; a transition over the query the location already decodes to keeps
   * it.
   */
  let keptIssues: readonly QueryIssue[] | null = config.issues;

  /**
   * A query as the location spells it, with the saved view open beside it,
   * the location's other parameters kept.
   */
  const spell = (
    query: Query,
    view: string | null,
    preserve: URLSearchParams,
  ): URLSearchParams => spellLocation({ schema, query, view, preserve });

  /** The query a location's parameters decode to, with what they refuse. */
  const decodeAt = (params: URLSearchParams): DecodedQuery =>
    decodeQuery({ schema, params, capabilities: host.capabilities });

  /**
   * Write a spelling, awaiting its echo. The oldest write still awaited is
   * landed first when the location already stands at it, since this write moves
   * past it. A write that throws without landing is forgotten — only that
   * write, since an earlier one with the same spelling is still on its way — so
   * the spelling arriving later from outside is a move to adopt. A write that
   * moves the location to its spelling at once lands every write made before
   * it, and stays awaited itself; one to where the location already stood waits
   * for its echo like any other.
   */
  const writeLocation = (next: URLSearchParams, history: HistoryMode): void => {
    const spelling = next.toString();
    const before = location.read().toString();
    if (awaited.at(0) === before) {
      landThrough(0);
    }
    awaited.push(spelling);
    try {
      location.write(next, { history });
    } catch (error) {
      if (location.read().toString() !== spelling) {
        const thrown = awaited.lastIndexOf(spelling);
        awaited = awaited.filter((_, index) => index !== thrown);
      }
      throw error;
    }
    if (before !== spelling && location.read().toString() === spelling) {
      // Kept awaited even when a listener already heard its echo within the
      // write: the read-back that follows is the loop's own spelling.
      awaited = [spelling];
    }
  };

  /**
   * Read the location: report what it refuses, respell what is clean but not
   * canonical, and adopt what it carries when the host stands elsewhere. The
   * respelling replaces, since it is not a step the reader took, and comes
   * before the adoption, so whatever the adoption provokes finds the location
   * already settled. A spelling the loop wrote of a query refuses nothing of
   * its own: while neither the provider's query nor the location has moved
   * since the provider was built, what it was refused for then stays reported.
   * A provider keeping no views stands on none, whatever view the location
   * names. The parameters come with their decoding, which a caller that already
   * has one reuses.
   */
  const readLocation = (
    params: URLSearchParams,
    decoded: DecodedQuery,
  ): void => {
    const view = keepsViews ? readOpenView(params) : null;
    issues.set(
      decoded.issues.length === 0 && keptIssues !== null
        ? keptIssues
        : decoded.issues,
    );
    // What the loop wrote itself is canonical by construction; only a
    // spelling that arrived from elsewhere can need respelling.
    if (decoded.issues.length === 0 && !awaited.includes(params.toString())) {
      const canonical = spell(decoded, view, params);
      if (canonical.toString() !== params.toString()) {
        writeLocation(canonical, "replace");
      }
    }
    // The open view is the location's as the query is: a move of either is
    // adopted, together.
    if (!isSameQuery(host.state.get(), decoded) || view !== host.view.get()) {
      host.adopt(
        { slice: decoded.slice, window: decoded.window },
        "adopt",
        view,
      );
    }
  };

  /**
   * Read a move the loop did not make: nothing it wrote is awaited any longer,
   * and the refusals read when the provider was built describe nothing.
   */
  const readMove = (params: URLSearchParams): void => {
    awaited = [];
    keptIssues = null;
    readLocation(params, decodeAt(params));
  };

  /**
   * Choose the spelling a transition entering history writes over the
   * location's parameters, and name the location's decoding. A reset returns to
   * the declared state whatever the location carries, so it always spells the
   * query canonically, as any move of the query does. Any other transition over
   * the query the location already decodes to — a view opened, reverted to or
   * left, or groups collapsed, which have no spelling — places only the view's
   * parameter, leaving a refused clause where the location carries it.
   */
  const chooseSpelling = (
    transition: Transition,
    params: URLSearchParams,
  ): {
    readonly spelled: URLSearchParams;
    readonly keepsQuery: boolean;
    readonly here: DecodedQuery;
  } => {
    const view = host.view.get();
    const here = decodeAt(params);
    const keepsQuery =
      transition.cause !== "reset" && isSameQuery(here, transition.query);
    return {
      spelled: keepsQuery
        ? placeView(params, view)
        : spell(transition.query, view, params),
      keepsQuery,
      here,
    };
  };

  /**
   * Name where a transition is spelled over: the newest write the loop still
   * awaits, where the location stands or will once that write lands, or the
   * location as it reads when none is awaited.
   */
  const readSpellingBase = (): URLSearchParams => {
    const newest = awaited.at(-1);
    return newest === undefined ? location.read() : new URLSearchParams(newest);
  };

  /**
   * Land an awaited write, and every one the loop made before it.
   */
  const landThrough = (index: number): void => {
    awaited.splice(0, index + 1);
  };

  /**
   * Land the awaited writes made before the one a location shows, keeping that
   * one awaited: a location may show a write at once and notify of it later.
   */
  const landBefore = (spelling: string): void => {
    const at = awaited.lastIndexOf(spelling);
    if (at > 0) {
      awaited.splice(0, at);
    }
  };

  /**
   * Write a transition that enters history, where the location says otherwise,
   * and read the spelling back: what was written is what the location now
   * carries, and a clause the source cannot execute — one a caller adopted past
   * the command boundary — is refused and narrowed exactly as it would be on a
   * reload. A transition entering no history writes nothing. It is spelled over
   * the newest write still awaited, or over the location when none is. A move a
   * listener makes within the write is not read back over, and a write that has
   * not landed yet reads back what was written. A move of the query drops the
   * refusals read before.
   */
  const writeTransition = (transition: Transition | null): void => {
    if (transition === null || transition.history === null) {
      return;
    }
    const params = readSpellingBase();
    const { spelled, keepsQuery, here } = chooseSpelling(transition, params);
    if (!keepsQuery) {
      keptIssues = null;
    }
    const spelledText = spelled.toString();
    if (spelledText !== params.toString()) {
      try {
        writeLocation(spelled, transition.history);
      } catch (error) {
        if (location.read().toString() === spelledText) {
          // Written, but a listener threw — perhaps before the loop's own
          // heard it. Read it back all the same, so a refusal is not lost.
          readLocation(spelled, decodeAt(spelled));
        }
        throw error;
      }
      // What was written is still the newest spelling awaited — landed at once,
      // or not landed yet — unless a listener moved the location within the
      // write: that move has been read already, and is not read back over.
      if (awaited.at(-1) !== spelledText) {
        return;
      }
    }
    readLocation(spelled, keepsQuery ? here : decodeAt(spelled));
  };

  /**
   * Read the moves made while an observation's first pass ran — by a listener
   * its adoption woke — and any move reading one provokes. Starting from
   * `before`, where the location stood before the pass, each read is compared
   * with the one before it: a match means nothing moved since, and a read
   * matching a spelling the loop still awaits is its own write, landed or not.
   * Any other read is a move not heard yet, and is read.
   */
  const readUnheardMoves = (before: string): void => {
    let seen = before;
    let moved = location.read();
    let spelling = moved.toString();
    while (spelling !== seen && !awaited.includes(spelling)) {
      seen = spelling;
      readMove(moved);
      moved = location.read();
      spelling = moved.toString();
    }
  };

  /**
   * Run an observation's first pass: adopt what the location carries, or — when
   * it carries no query, or a reset nothing observed must be written over it —
   * spell the host's query onto it and read that spelling back, landed or not,
   * its arrival later awaited as the loop's own; a location already carrying
   * it, or a write still awaited of it, is left unwritten. Read back, a clause
   * the source cannot execute is refused and reported the way any other
   * location clause is, while what the snapshot's query was refused for —
   * already left out of the host's — stays reported while neither the
   * provider's query nor the location has moved since. A move made while the
   * pass ran, by a listener its adoption woke, is read before the pass ends.
   */
  const runFirstPass = (
    params: URLSearchParams,
    adoptsLocation: boolean,
  ): void => {
    const standing = location.read().toString();
    const target = adoptsLocation
      ? params
      : spell(host.state.get(), host.view.get(), params);
    if (target.toString() !== params.toString()) {
      writeLocation(target, "replace");
    }
    readLocation(target, decodeAt(target));
    readUnheardMoves(standing);
  };

  /**
   * Forget the refusals read when the provider was built once they describe
   * nothing: when the host moved while nothing observed, or the location
   * moved away from the spelling of the query the host stands on. Only
   * refusals there are to keep are worth spelling the host's query for.
   */
  const forgetStaleIssues = (
    params: URLSearchParams,
    carriesQuery: boolean,
    hostMoved: boolean,
  ): void => {
    const locationLeftHost =
      keptIssues !== null &&
      keptIssues.length > 0 &&
      carriesQuery &&
      spell(host.state.get(), host.view.get(), params).toString() !==
        params.toString();
    if (hostMoved || locationLeftHost) {
      keptIssues = null;
    }
  };

  /**
   * Run an observation's first pass while recording what a listener
   * announces during it. The loop does not listen yet, so the last transition
   * entering history — a command woken by the pass's adoption — is named, to
   * be written once it does; null when there was none.
   */
  const runRecordedFirstPass = (
    params: URLSearchParams,
    adoptsLocation: boolean,
  ): Transition | null => {
    let recorded: Transition | null = null;
    const stopRecording = host.transitions.subscribe(() => {
      const transition = host.transitions.get();
      if (transition !== null && transition.history !== null) {
        recorded = transition;
      }
    });
    try {
      runFirstPass(params, adoptsLocation);
    } finally {
      stopRecording();
    }
    return recorded;
  };

  /**
   * Listen to the location and the host once an observation's first pass is
   * done, and name the stop of both. Awaited writes made before the one the
   * location already shows have landed, and are awaited no more; the one it
   * shows stays awaited, for a location that shows a write at once and notifies
   * of it later. Where the location stands is no move while subscribing: a
   * notification of that very spelling, sent as the location is subscribed to,
   * is ignored. Subscribing after the pass keeps a location that notifies on
   * subscribe from adopting itself over the host's query before the pass has
   * read it. Each subscription is its own closure, never a shared function:
   * listeners are held in a set, so two observations subscribing one reference
   * would register once and the first release would deafen the second.
   */
  const listen = (): (() => void) => {
    const standing = location.read().toString();
    landBefore(standing);
    let subscribing = true;
    const stopLocation = location.subscribe(() => {
      const current = location.read();
      const spelling = current.toString();
      if (subscribing && spelling === standing) {
        return;
      }
      const landed = awaited.indexOf(spelling);
      if (landed >= 0) {
        landThrough(landed);
        return;
      }
      readMove(current);
    });
    subscribing = false;
    const stopTransitions = host.transitions.subscribe(() => {
      heard = host.transitions.get();
      writeTransition(heard);
    });
    return () => {
      stopLocation();
      stopTransitions();
    };
  };

  /**
   * Write a transition a listener announced while an observation's first
   * pass ran, as the host stands now: where the command left it, or a move
   * adopted over it since. A write that throws stops what the observation
   * subscribed, so a failed observation leaves nothing behind.
   */
  const replayUnwritten = (unwritten: Transition, stop: () => void): void => {
    const { slice, window } = host.state.get();
    const query = { slice, window };
    // A reset the host has since moved on from is no longer where it stands:
    // what is written is the move over it, which keeps a refused clause as any
    // other move over the same query does. The transition is the loop's own
    // and never announced: only whether it reads as a reset matters.
    const cause =
      unwritten.cause === "reset" && !isSameQuery(query, unwritten.query)
        ? "adopt"
        : unwritten.cause;
    try {
      writeTransition({ query, cause, history: unwritten.history });
    } catch (error) {
      stop();
      throw error;
    }
  };

  /**
   * Settle the writes awaited when the loop was last released against where the
   * location stands now. A location showing one of them has landed every one
   * before it, and the one it shows stays awaited, for a location that shows a
   * write at once and notifies of it later. A location that moved elsewhere
   * while nothing observed it is owed no echo of any; one standing where the
   * loop was released still awaits the writes then in flight. An observation
   * then spells over the newest write still awaited.
   */
  const settleAwaited = (): void => {
    const current = location.read().toString();
    landBefore(current);
    // Showing none of them, and moved since the release: owed no echo of any.
    if (awaited.at(0) !== current && current !== releasedAt) {
      awaited = [];
    }
  };

  return {
    issues: protectChannel(issues),
    observe(): () => void {
      let live = true;
      settleAwaited();
      const params = readSpellingBase();
      const last = host.transitions.get();
      const hostMoved = last !== heard;
      const unheardReset = hostMoved && last?.cause === "reset";
      const carriesQuery = isCarryingQuery({ params, schema, keepsViews });
      forgetStaleIssues(params, carriesQuery, hostMoved);
      const unwritten = runRecordedFirstPass(
        params,
        carriesQuery && !unheardReset,
      );
      heard = host.transitions.get();
      const stop = listen();
      if (unwritten !== null) {
        replayUnwritten(unwritten, stop);
      }
      return function release(): void {
        if (!live) {
          return;
        }
        live = false;
        stop();
        releasedAt = location.read().toString();
      };
    },
  };
}
