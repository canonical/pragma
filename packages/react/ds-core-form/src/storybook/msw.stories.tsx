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

  return <div>{data ? JSON.stringify(data) : "Loading..."}</div>;
};

export const TestDecorator: Story = {
  render: () => {
    const [data, setData] = useState(null);

    useEffect(() => {
      fetch("/api/test")
        .then((res) => res.json())
        .then((data) => setData(data));
    }, []);

    return <div>{data ? JSON.stringify(data) : "Loading..."}</div>;
  },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/test", () => {
          return new Response(
            JSON.stringify({ message: "Decorator Mocked Response" }),
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
