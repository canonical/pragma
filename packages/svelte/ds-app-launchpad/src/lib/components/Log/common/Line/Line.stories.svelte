<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Link } from "../../../Link/index.js";
  import { setLogContext } from "../../context.js";
  import { Log } from "../../index.js";
  import Line from "./Line.svelte";

  const { Story } = defineMeta({
    title: "Components/Log/Line",
    tags: ["autodocs"],
    component: Line,
    args: {
      timestamp: "2024-10-27T10:00:59.400Z",
      line: 140,
    },
    argTypes: {
      children: { control: { disable: true } },
    },
  });
</script>

<script lang="ts">
  setLogContext({
    timeZone: "UTC",
    hideTimestamps: false,
    wrapLines: false,
  });

  function highlightLine(hash: string | null) {
    if (!hash) return;
    location.hash = "#__storybook-reset__";

    requestAnimationFrame(() => {
      location.hash = hash;
    });
  }
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <Log>
      <Log.Line {...args}>Disconnecting...</Log.Line>
    </Log>
  {/snippet}
</Story>

<Story name="With multiline message">
  {#snippet template({ children: _, ...args })}
    <Log>
      <Log.Line {...args}>Simulated stack trace for a database connection timeout:
java.sql.SQLTimeoutException: Connection timed out
    at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:180)
    at com.zaxxer.hikari.HikariDataSource.getConnection(HikariDataSource.java:100)
    at com.example.app.DatabaseService.connect(DatabaseService.java:45)
    at com.example.app.Main.main(Main.java:23)
    at java.net.SocketTimeoutException: connect timed out
    at java.net.PlainSocketImpl.socketConnect(Native Method)
    at java.net.AbstractPlainSocketImpl.doConnect(AbstractPlainSocketImpl.java:350)
    at java.net.AbstractPlainSocketImpl.connectToAddress(AbstractPlainSocketImpl.java:206)
    at java.net.AbstractPlainSocketImpl.connect(AbstractPlainSocketImpl.java:188)
    at java.net.SocksSocketImpl.connect(SocksSocketImpl.java:392)
    at java.net.Socket.connect(Socket.java:589)</Log.Line>
    </Log>
  {/snippet}
</Story>

<!-- `Log.Line` supports highlighting a line using the :target pseudo-class. If a line's id matches the URL hash, it will be highlighted for 5 seconds. Click the line number to see this in action. -->

<Story
  name="With link as line number and :target highlight"
  argTypes={{ line: { control: { disable: true } } }}
>
  {#snippet template({ children: _, line: __, ...args })}
    <Log>
      <Log.Line id="line-140" {...args}>
        {#snippet line()}
          <Link
            href="#line-140"
            soft
            onclick={(e) => {
              // This onclick is for storybook's presentation purposes only to simulate native behavior.
              // In a real application, the browser's native fragment navigation would:
              // 1. Update the URL hash to `#line-140`
              // 2. Scroll the element with id `line-140` into view
              // 3. Apply the :target styles to the element with id `line-140` (the `Log.Line` component in this case)
              e.preventDefault();
              highlightLine(e.currentTarget.getAttribute("href"));
            }}>140</Link
          >
        {/snippet}
        Click the line number to highlight this line using the :target pseudo-class.
      </Log.Line>
    </Log>
  {/snippet}
</Story>
