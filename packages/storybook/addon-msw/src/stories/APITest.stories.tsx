import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import APITest from "./APITest.js";

const meta: Meta<typeof APITest> = {
  title: "Addon/API Test",
  component: APITest,
};

export default meta;
type Story = StoryObj<typeof APITest>;

export const SuccessResponse: Story = {
  args: { endpoint: "/api/user" },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/user", () =>
          HttpResponse.json({ id: 1, name: "John Doe" }),
        ),
      ],
    },
  },
};

export const ErrorResponse: Story = {
  args: { endpoint: "/api/user" },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/user", () =>
          HttpResponse.json({ error: "Not Found" }, { status: 404 }),
        ),
      ],
    },
  },
};

export const DelayedResponse: Story = {
  args: { endpoint: "/api/user" },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/user", async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return HttpResponse.json({ id: 1, name: "John Doe" });
        }),
      ],
    },
  },
};

export const UnauthorizedResponse: Story = {
  args: { endpoint: "/api/protected" },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/protected", () =>
          HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
        ),
      ],
    },
  },
};

export const ServerErrorResponse: Story = {
  args: { endpoint: "/api/server-error" },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/server-error", () =>
          HttpResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
          ),
        ),
      ],
    },
  },
};

export const TimeoutSimulation: Story = {
  args: { endpoint: "/api/timeout" },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/timeout", async () => {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return HttpResponse.json({ message: "This took a while" });
        }),
      ],
    },
  },
};
