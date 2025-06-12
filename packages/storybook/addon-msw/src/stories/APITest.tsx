// src/stories/ApiTestComponent.tsx
import React, { useCallback, useEffect, useState } from "react";

interface ApiTestComponentProps {
  endpoint?: string;
  delay?: number;
}

type Data = { [key: string]: unknown } | null;

// Test component that makes various API calls
const ApiTestComponent = ({
  endpoint = "/api/test",
  delay = 0,
}: ApiTestComponentProps) => {
  const [data, setData] = useState<Data>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Add artificial delay if specified
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [endpoint, delay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3>MSW Addon Test Component</h3>
      <p>
        Endpoint: <code>{endpoint}</code>
      </p>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#f5f5f5",
          borderRadius: "5px",
          minHeight: "100px",
        }}
      >
        {loading && <p>Loading...</p>}
        {error && (
          <div style={{ color: "red" }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {data && (
          <div>
            <strong>Response:</strong>
            <pre style={{ marginTop: "10px" }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={fetchData}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Refresh Data
      </button>
    </div>
  );
};

export default ApiTestComponent;
