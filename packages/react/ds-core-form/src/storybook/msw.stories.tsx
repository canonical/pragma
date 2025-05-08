import type { Meta, StoryObj } from "@storybook/react";
import { http } from "msw";
import { useEffect, useState } from "react";

const meta = {
  title: "Test/MSW",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TestGlobalAPI = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/test")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  return (
    <div>
      <p>
        Should return ""Hello from MSW", indicating MSW is successfully
        configured at the storybook level.
      </p>
      <pre>{data ? JSON.stringify(data) : "Loading..."}</pre>
    </div>
  );
};

const decoratorResponsePayload = "Decorator Mocked Response";

export const TestDecorator: Story = {
  render: () => {
    const [data, setData] = useState(null);

    useEffect(() => {
      fetch("/api/test")
        .then((res) => res.json())
        .then((data) => setData(data));
    }, []);

    return (
      <div>
        <p>
          Should return "{decoratorResponsePayload}", indicating MSW
          successfully adds handlers at the story level.
        </p>
        <pre>{data ? JSON.stringify(data) : "Loading..."}</pre>
      </div>
    );
  },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/test", () => {
          return new Response(
            JSON.stringify({ message: decoratorResponsePayload }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }),
      ],
    },
  },
};
