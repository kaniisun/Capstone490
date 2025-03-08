import React, { useState, useEffect } from "react";
import { supabase, testSupabaseConnection } from "../../../supabaseClient";

function ConnectionTester() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Run basic test on component mount
  useEffect(() => {
    runBasicTest();
  }, []);

  const runBasicTest = async () => {
    setLoading(true);
    try {
      const result = await testSupabaseConnection();
      addTestResult("Basic Connection Test", result.success, result.error);
    } catch (error) {
      addTestResult("Basic Connection Test", false, error);
    }
    setLoading(false);
  };

  const runFullTest = async () => {
    setLoading(true);
    setTestResults([]);

    // Test 1: Basic connection
    try {
      const result = await testSupabaseConnection();
      addTestResult("Basic Connection Test", result.success, result.error);
    } catch (error) {
      addTestResult("Basic Connection Test", false, error);
    }

    // Test 2: Try to fetch public data
    try {
      const { data, error } = await supabase
        .from("users")
        .select("count", { count: "exact", head: true });

      addTestResult("Public Data Fetch", !error, error);
    } catch (error) {
      addTestResult("Public Data Fetch", false, error);
    }

    // Test 3: Test auth functionality
    try {
      const { data, error } = await supabase.auth.getSession();
      addTestResult("Auth Service", !error, error);
    } catch (error) {
      addTestResult("Auth Service", false, error);
    }

    // Test 4: Network info
    try {
      const networkInfo = {
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
      };

      addTestResult("Browser Network Info", true, null, networkInfo);
    } catch (error) {
      addTestResult("Browser Network Info", false, error);
    }

    setLoading(false);
  };

  const addTestResult = (name, success, error, details = null) => {
    setTestResults((prev) => [
      ...prev,
      {
        name,
        success,
        error: error ? { message: error.message, details: error } : null,
        details,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="connection-tester">
      <h2>Supabase Connection Tester</h2>
      <div className="test-controls">
        <button
          onClick={runFullTest}
          disabled={loading}
          className="test-button"
        >
          {loading ? "Testing..." : "Run Full Test"}
        </button>
      </div>

      <div className="test-results">
        <h3>Test Results:</h3>
        {testResults.length === 0 && !loading ? (
          <p>No tests run yet.</p>
        ) : (
          <ul className="results-list">
            {testResults.map((result, index) => (
              <li
                key={index}
                className={`result-item ${
                  result.success ? "success" : "failure"
                }`}
              >
                <div className="result-header">
                  <span className="result-name">{result.name}:</span>
                  <span
                    className={`result-status ${
                      result.success ? "success" : "failure"
                    }`}
                  >
                    {result.success ? "✅ Success" : "❌ Failed"}
                  </span>
                </div>

                {result.error && (
                  <div className="error-details">
                    <p>Error: {result.error.message}</p>
                  </div>
                )}

                {result.details && (
                  <div className="additional-details">
                    <pre>{JSON.stringify(result.details, null, 2)}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="debug-info">
        <h3>Manual Troubleshooting Steps:</h3>
        <ol>
          <li>
            Check if you can access the Supabase URL directly:{" "}
            <a
              href="https://vfjcutqzhhcvqjqjzwaf.supabase.co"
              target="_blank"
              rel="noopener noreferrer"
            >
              Supabase Project
            </a>
          </li>
          <li>
            Verify that your browser's network connectivity is working for other
            sites
          </li>
          <li>
            Ensure you don't have any browser extensions blocking the
            connections
          </li>
          <li>Try using a different browser</li>
          <li>
            Try using a different network connection (switch from WiFi to mobile
            data or vice versa)
          </li>
        </ol>
      </div>

      <style jsx>{`
        .connection-tester {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h2 {
          text-align: center;
          color: #333;
        }

        .test-controls {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }

        .test-button {
          background-color: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }

        .test-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }

        .results-list {
          list-style: none;
          padding: 0;
        }

        .result-item {
          margin-bottom: 15px;
          padding: 15px;
          border-radius: 5px;
          background-color: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .result-name {
          font-weight: bold;
        }

        .result-status.success {
          color: #22c55e;
        }

        .result-status.failure {
          color: #ef4444;
        }

        .error-details {
          background-color: #fee2e2;
          border-left: 3px solid #ef4444;
          padding: 10px;
          margin-top: 10px;
          border-radius: 5px;
        }

        .additional-details {
          background-color: #f3f4f6;
          padding: 10px;
          margin-top: 10px;
          border-radius: 5px;
          overflow-x: auto;
        }

        pre {
          margin: 0;
          font-size: 12px;
        }

        .debug-info {
          margin-top: 30px;
          padding: 15px;
          background-color: #e0f2fe;
          border-radius: 5px;
        }

        .debug-info h3 {
          margin-top: 0;
        }

        .debug-info ol {
          padding-left: 20px;
        }

        .debug-info li {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}

export default ConnectionTester;
