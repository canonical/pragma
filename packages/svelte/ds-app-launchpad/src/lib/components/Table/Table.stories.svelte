<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { HTMLThAttributes } from "svelte/elements";
  import { SeededRandom } from "../../../../testing/SeededRandom.js";
  import { DateTime } from "../DateTime/index.js";
  import { Link } from "../Link/index.js";
  import { RelativeDateTime } from "../RelativeDateTime/index.js";
  import { Table } from "./index.js";

  const { Story } = defineMeta({
    title: "Components/Table",
    tags: ["autodocs"],
    component: Table,
  });

  type FakeRow = {
    id: number;
    name: string;
    surname: string;
    city: string;
    street: string;
    birthday: Date;
    registered: Date;
    profile: string;
    balance: number;
  };

  function generateFakeTableData(count: number): FakeRow[] {
    const seededRandom = new SeededRandom();

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: seededRandom.pick([
        "Alice",
        "Bob",
        "Charlie",
        "Dana",
        "Evan",
        "Fatima",
        "Grace",
        "Hugo",
        "Ivy",
        "Jules",
        "Kai",
        "Lena",
      ]),
      surname: seededRandom.pick([
        "Smith",
        "Johnson",
        "Williams",
        "Brown",
        "Jones",
        "Garcia",
        "Miller",
        "Davis",
      ]),
      city: seededRandom.pick([
        "New York",
        "San Francisco",
        "Chicago",
        "Austin",
        "Seattle",
        "Denver",
        "Boston",
        "Atlanta",
      ]),
      street: seededRandom.pick([
        "5th Avenue",
        "Market Street",
        "Michigan Avenue",
        "Broadway",
        "Sunset Blvd",
        "Pine Street",
        "Lake Shore Dr",
      ]),
      birthday: seededRandom.date("1975-01-01", "2005-12-31"),
      registered: seededRandom.date("2016-01-01", "2024-12-31"),
      profile: `https://example.com/${i + 1}`,
      balance: seededRandom.int(-500, 5000),
    }));
  }

  const fakeData = generateFakeTableData(30);
  const totalBalance = fakeData.reduce((sum, row) => sum + row.balance, 0);

  let sortKey = $state<keyof FakeRow>();
  let sortDirection = $state<HTMLThAttributes["aria-sort"]>();
</script>

<Story name="Default" asChild>
  <Table style="width: 100%;">
    <caption>Static table</caption>
    <thead>
      <tr>
        <th scope="col">User</th>
        <th scope="col">Address</th>
        <th scope="col">Birthday</th>
        <th scope="col">Registered</th>
        <th scope="col">Balance</th>
      </tr>
    </thead>
    <tbody>
      {#each fakeData as row (row.id)}
        <tr>
          <th scope="row">
            <Link href={row.profile}>
              {row.name}
              {row.surname}
            </Link>
          </th>
          <td>{row.street}, {row.city}</td>
          <td><DateTime date={row.birthday} /></td>
          <td><RelativeDateTime date={row.registered} /></td>
          <td>
            {row.balance.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <th colspan="4" scope="row" style="text-align: end;">Total Balance</th>
        <td>
          {totalBalance.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </td>
      </tr>
    </tfoot>
  </Table>
</Story>

<Story name="With sorting headers" asChild>
  <!-- 
    <script>
      let sortKey = $state();
      let sortDirection = $state();
    </script>
  -->
  <Table style="width: 100%;">
    <caption>Sortable table</caption>
    <thead>
      <tr>
        {#each [["name", "User"], ["street", "Address"], ["birthday", "Birthday"], ["registered", "Registered"], ["balance", "Balance"]] as const as [key, label]}
          <Table.TH
            scope="col"
            aria-sort={sortKey === key ? sortDirection : "none"}
          >
            {label}
            {#snippet action()}
              <Table.TH.SortButton
                onclick={() => {
                  if (sortKey !== key) {
                    sortKey = key;
                    sortDirection = "ascending";
                  } else if (sortDirection === "ascending") {
                    sortDirection = "descending";
                  } else {
                    sortKey = undefined;
                    sortDirection = undefined;
                  }
                }}
                aria-label={sortKey !== key
                  ? `Sort by ${label} ascending`
                  : sortDirection === "ascending"
                    ? `Sort by ${label} descending`
                    : `Remove sorting by ${label}`}
              />
            {/snippet}
          </Table.TH>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each fakeData.toSorted((a, b) => {
        if (sortKey && sortDirection) {
          const aValue = a[sortKey];
          const bValue = b[sortKey];

          if (typeof aValue === "string" && typeof bValue === "string") {
            return sortDirection === "ascending" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
          }

          if (aValue < bValue) return sortDirection === "ascending" ? -1 : 1;
          if (aValue > bValue) return sortDirection === "ascending" ? 1 : -1;
        }
        return 0;
      }) as row (row.id)}
        <tr>
          <th scope="row">
            <Link href={row.profile}>
              {row.name}
              {row.surname}
            </Link>
          </th>
          <td>{row.street}, {row.city}</td>
          <td><DateTime date={row.birthday} /></td>
          <td><RelativeDateTime date={row.registered} /></td>
          <td>
            {row.balance.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <th colspan="4" scope="row" style="text-align: end;">Total Balance</th>
        <td>
          {totalBalance.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </td>
      </tr>
    </tfoot>
  </Table>
</Story>
