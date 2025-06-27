import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import DynamicSearch from "./DynamicSearch.js";

const meta: Meta<typeof DynamicSearch> = {
  title: "Addon/Dynamic Search",
  component: DynamicSearch,
};

export default meta;
type Story = StoryObj<typeof DynamicSearch>;

export const DefaultSearch: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/search", ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get("q") || "";
          const users = [
            { id: 1, name: "John Doe", email: "john@example.com" },
            { id: 2, name: "Jane Smith", email: "jane@example.com" },
          ];
          const filteredUsers = users.filter((user) =>
            user.name.toLowerCase().includes(query.toLowerCase()),
          );
          return HttpResponse.json({
            query,
            count: filteredUsers.length,
            results: filteredUsers,
          });
        }),
      ],
    },
  },
};

export const EmptySearchResults: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/search", () =>
          HttpResponse.json({ query: "nonexistent", count: 0, results: [] }),
        ),
      ],
    },
  },
};

export const LargeDataset: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/search", () => {
          const users = Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
          }));
          return HttpResponse.json({
            query: "",
            count: users.length,
            results: users,
          });
        }),
      ],
    },
  },
};

export const SpecialCharactersSearch: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/search", ({ request }) => {
          const url = new URL(request.url);
          const query = url.searchParams.get("q") || "";
          const users = [
            { id: 1, name: "John Doe!", email: "john@example.com" },
            { id: 2, name: "Jane@Smith", email: "jane@example.com" },
          ];
          const filteredUsers = users.filter((user) =>
            user.name.includes(query),
          );
          return HttpResponse.json({
            query,
            count: filteredUsers.length,
            results: filteredUsers,
          });
        }),
      ],
    },
  },
};
