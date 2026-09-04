import { useEffect, useState } from "react";
import "./App.css";

const LIMITS = {
  air_temperature: {
    min: 295.3,
    max: 304.5,
    unit: "K",
    label: "Air Temperature",
  },
  process_temperature: {
    min: 305.7,
    max: 313.8,
    unit: "K",
    label: "Process Temperature",
  },
  rotational_speed: {
    min: 1168,
    max: 2886,
    unit: "RPM",
    label: "Rotational Speed",
  },
  torque: {
    min: 3.8,
    max: 76.6,
    unit: "Nm",
    label: "Torque",
  },
  tool_wear: {
    min: 0,
    max: 253,
    unit: "min",
    label: "Tool Wear",
  },
};

const MAX_HISTORY = 10;

function App() {
  const [formData, setFormData] = useState({
    air_temperature: "",
    process_temperature: "",
    rotational_speed: "",
    torque: "",
    tool_wear: "",
  });

  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [history, setHistory] = useState([]);

  // Load prediction history from SQLite database
useEffect(() => {
  const loadHistory = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/predictions"
      );

      if (!response.ok) {
        throw new Error("Failed to load prediction history.");
      }

      const data = await response.json();

      const formattedHistory = data.predictions.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,

        inputs: {
          air_temperature: item.air_temperature,
          process_temperature: item.process_temperature,
          rotational_speed: item.rotational_speed,
          torque: item.torque,
          tool_wear: item.tool_wear,
        },

        prediction: item.prediction,
        failure_probability: item.failure_probability,
        risk_level: item.risk_level,
        maintenance_required: Boolean(item.maintenance_required),
      }));

      setHistory(formattedHistory.slice(0, MAX_HISTORY));
      } catch (error) {
      console.error(
        "Unable to load prediction history:",
        error
      );
    }
  };

  loadHistory();
}, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setApiError("");
  };

  const validateForm = () => {
    const newErrors = {};

    Object.entries(LIMITS).forEach(([field, config]) => {
      const rawValue = formData[field];

      if (rawValue === "") {
        newErrors[field] = `${config.label} is required.`;
        return;
      }

      const value = Number(rawValue);

      if (!Number.isFinite(value)) {
        newErrors[field] = `Enter a valid number for ${config.label}.`;
        return;
      }

      if (value < config.min || value > config.max) {
        newErrors[field] =
          `${config.label} must be between ${config.min} and ${config.max} ${config.unit}.`;
      }
    });

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handlePredict = async (event) => {
    event.preventDefault();

    setResult(null);
    setApiError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          air_temperature: Number(formData.air_temperature),
          process_temperature: Number(formData.process_temperature),
          rotational_speed: Number(formData.rotational_speed),
          torque: Number(formData.torque),
          tool_wear: Number(formData.tool_wear),
        }),
      });

      if (!response.ok) {
        let errorMessage = "Prediction request failed.";

        try {
          const errorData = await response.json();

          if (errorData.detail) {
            errorMessage = Array.isArray(errorData.detail)
              ? "Invalid machine parameters. Please check your inputs."
              : errorData.detail;
          }
        } catch {
          // Keep default error message
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      setResult(data);

      // Refresh history from database after successful prediction
  const historyResponse = await fetch(
    "http://127.0.0.1:8000/predictions"
  );

  if (!historyResponse.ok) {
    throw new Error("Prediction saved, but history could not be loaded.");
  }

  const historyData = await historyResponse.json();

  const formattedHistory = historyData.predictions.map((item) => ({
    id: item.id,
    timestamp: item.timestamp,

    inputs: {
      air_temperature: item.air_temperature,
      process_temperature: item.process_temperature,
      rotational_speed: item.rotational_speed,
      torque: item.torque,
      tool_wear: item.tool_wear,
    },

    prediction: item.prediction,
    failure_probability: item.failure_probability,
    risk_level: item.risk_level,
    maintenance_required: Boolean(item.maintenance_required),
  }));

  setHistory(formattedHistory.slice(0, MAX_HISTORY));
    } catch (error) {
      setApiError(
        error.message ||
          "Unable to connect to PredictX API. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      air_temperature: "",
      process_temperature: "",
      rotational_speed: "",
      torque: "",
      tool_wear: "",
    });

    setErrors({});
    setResult(null);
    setApiError("");
  };

  const clearHistory = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/predictions",
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to clear prediction history.");
      }

      setHistory([]);
      setResult(null);
      setApiError("");
    } catch (error) {
      setApiError(
        error.message ||
          "Unable to clear prediction history. Make sure FastAPI is running."
      );
    }
  };

  const totalPredictions = history.length;

const failuresDetected = history.filter(
  (item) => item.prediction === 1
).length;

const highRiskCount = history.filter(
  (item) => item.risk_level === "HIGH"
).length;

const averageProbability =
  history.length > 0
    ? (
        history.reduce(
          (sum, item) => sum + Number(item.failure_probability),
          0
        ) / history.length
      ).toFixed(1)
    : "0.0";

const normalCount = history.filter(
  (item) => item.prediction === 0
).length;

const failureCount = history.filter(
  (item) => item.prediction === 1
).length;

const lowRiskCount = history.filter(
  (item) => item.risk_level === "LOW"
).length;

const mediumRiskCount = history.filter(
  (item) => item.risk_level === "MEDIUM"
).length;

const failureRate =
  totalPredictions > 0
    ? ((failureCount / totalPredictions) * 100).toFixed(1)
    : "0.0";

const normalPercentage =
  totalPredictions > 0
    ? ((normalCount / totalPredictions) * 100).toFixed(1)
    : "0";

const failurePercentage =
  totalPredictions > 0
    ? ((failureCount / totalPredictions) * 100).toFixed(1)
    : "0";

const lowRiskPercentage =
  totalPredictions > 0
    ? ((lowRiskCount / totalPredictions) * 100).toFixed(1)
    : "0";

const mediumRiskPercentage =
  totalPredictions > 0
    ? ((mediumRiskCount / totalPredictions) * 100).toFixed(1)
    : "0";

const highRiskPercentage =
  totalPredictions > 0
    ? ((highRiskCount / totalPredictions) * 100).toFixed(1)
    : "0";

  const getRiskClass = (risk) => {
    if (risk === "HIGH") return "risk-high";
    if (risk === "MEDIUM") return "risk-medium";
    return "risk-low";
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">P</div>

          <div>
            <h1>PredictX</h1>
            <span>Predictive Maintenance AI</span>
          </div>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          AI System Online
        </div>
      </header>

      <main className="dashboard">
        <section className="intro">
          <div>
            <p className="eyebrow">INDUSTRIAL AI MONITORING</p>

            <h2>
              Predict machine failure
              <br />
              before it happens.
            </h2>

            <p className="intro-text">
              Enter the machine&apos;s current operating parameters and let the
              trained Random Forest model estimate failure risk.
            </p>
          </div>

          <div className="model-card">
            <span>MODEL</span>
            <strong>Random Forest</strong>
            <small>Production model</small>
          </div>
        </section>

        <div className="content-grid">
          <section className="card input-card">
            <div className="card-header">
              <div>
                <p className="section-label">INPUT</p>
                <h3>Machine Parameters</h3>
              </div>

              <span className="live-badge">LIVE</span>
            </div>

            <form onSubmit={handlePredict} noValidate>
              <div className="form-grid">
                <div className="input-group">
                  <label htmlFor="air_temperature">
                    Air Temperature
                  </label>

                  <div
                    className={`input-wrapper ${
                      errors.air_temperature ? "input-error" : ""
                    }`}
                  >
                    <input
                      id="air_temperature"
                      type="number"
                      name="air_temperature"
                      value={formData.air_temperature}
                      onChange={handleChange}
                      placeholder="304"
                      step="0.1"
                      min={LIMITS.air_temperature.min}
                      max={LIMITS.air_temperature.max}
                      required
                    />

                    <span>K</span>
                  </div>

                  {errors.air_temperature && (
                    <small className="field-error">
                      {errors.air_temperature}
                    </small>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="process_temperature">
                    Process Temperature
                  </label>

                  <div
                    className={`input-wrapper ${
                      errors.process_temperature ? "input-error" : ""
                    }`}
                  >
                    <input
                      id="process_temperature"
                      type="number"
                      name="process_temperature"
                      value={formData.process_temperature}
                      onChange={handleChange}
                      placeholder="313"
                      step="0.1"
                      min={LIMITS.process_temperature.min}
                      max={LIMITS.process_temperature.max}
                      required
                    />

                    <span>K</span>
                  </div>

                  {errors.process_temperature && (
                    <small className="field-error">
                      {errors.process_temperature}
                    </small>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="rotational_speed">
                    Rotational Speed
                  </label>

                  <div
                    className={`input-wrapper ${
                      errors.rotational_speed ? "input-error" : ""
                    }`}
                  >
                    <input
                      id="rotational_speed"
                      type="number"
                      name="rotational_speed"
                      value={formData.rotational_speed}
                      onChange={handleChange}
                      placeholder="1400"
                      min={LIMITS.rotational_speed.min}
                      max={LIMITS.rotational_speed.max}
                      required
                    />

                    <span>RPM</span>
                  </div>

                  {errors.rotational_speed && (
                    <small className="field-error">
                      {errors.rotational_speed}
                    </small>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="torque">Torque</label>

                  <div
                    className={`input-wrapper ${
                      errors.torque ? "input-error" : ""
                    }`}
                  >
                    <input
                      id="torque"
                      type="number"
                      name="torque"
                      value={formData.torque}
                      onChange={handleChange}
                      placeholder="65"
                      step="0.1"
                      min={LIMITS.torque.min}
                      max={LIMITS.torque.max}
                      required
                    />

                    <span>Nm</span>
                  </div>

                  {errors.torque && (
                    <small className="field-error">
                      {errors.torque}
                    </small>
                  )}
                </div>

                <div className="input-group full-width">
                  <label htmlFor="tool_wear">Tool Wear</label>

                  <div
                    className={`input-wrapper ${
                      errors.tool_wear ? "input-error" : ""
                    }`}
                  >
                    <input
                      id="tool_wear"
                      type="number"
                      name="tool_wear"
                      value={formData.tool_wear}
                      onChange={handleChange}
                      placeholder="220"
                      min={LIMITS.tool_wear.min}
                      max={LIMITS.tool_wear.max}
                      required
                    />

                    <span>min</span>
                  </div>

                  {errors.tool_wear && (
                    <small className="field-error">
                      {errors.tool_wear}
                    </small>
                  )}
                </div>
              </div>

              <div className="button-row">
                <button
                  className="predict-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Analyzing..." : "Run AI Prediction"}
                </button>

                <button
                  className="reset-button"
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Reset
                </button>
              </div>
            </form>

            {apiError && (
              <div className="error-message" role="alert">
                {apiError}
              </div>
            )}
          </section>

          <section className="card result-card">
            <div className="card-header">
              <div>
                <p className="section-label">OUTPUT</p>
                <h3>Prediction Result</h3>
              </div>
            </div>

            {!result ? (
              <div className="empty-state">
                <div className="empty-icon">AI</div>

                <h4>Ready for analysis</h4>

                <p>
                  Enter valid machine parameters and run the AI prediction.
                </p>
              </div>
            ) : (
              <div className="result-content">
                <div className="probability-section">
                  <div className="probability-header">
                    <span>Failure Probability</span>

                    <strong>{result.failure_probability}%</strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          Math.max(Number(result.failure_probability), 0),
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="result-grid">
                  <div className="result-box">
                    <span>Prediction</span>

                    <strong>
                      {result.prediction === 1
                        ? "FAILURE"
                        : "NO FAILURE"}
                    </strong>
                  </div>

                  <div className="result-box">
                    <span>Risk Level</span>

                    <strong className={getRiskClass(result.risk_level)}>
                      {result.risk_level}
                    </strong>
                  </div>

                  <div className="result-box full-result">
                    <span>Maintenance Required</span>

                    <strong>
                      {result.maintenance_required ? "YES" : "NO"}
                    </strong>
                  </div>
                </div>

                <div
                  className={`maintenance-message ${
                    result.prediction === 1
                      ? "message-danger"
                      : "message-safe"
                  }`}
                >
                  {result.prediction === 1
                    ? "Machine requires maintenance."
                    : "Machine is operating normally."}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Prediction History */}
        <section className="card history-card">
          <div className="history-header">
            <div>
              <p className="section-label">ACTIVITY</p>
              <h3>Prediction History</h3>
              <span className="history-subtitle">
                Last {Math.min(history.length, MAX_HISTORY)} predictions
              </span>
            </div>

            {history.length > 0 && (
              <button
                className="clear-history-button"
                type="button"
                onClick={clearHistory}
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="history-empty">
              No prediction history yet.
              <span>Run your first AI prediction to see it here.</span>
            </div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Air Temp</th>
                    <th>Process Temp</th>
                    <th>RPM</th>
                    <th>Torque</th>
                    <th>Tool Wear</th>
                    <th>Probability</th>
                    <th>Risk</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.timestamp)}</td>

                      <td>{item.inputs.air_temperature} K</td>

                      <td>{item.inputs.process_temperature} K</td>

                      <td>{item.inputs.rotational_speed}</td>

                      <td>{item.inputs.torque} Nm</td>

                      <td>{item.inputs.tool_wear} min</td>

                      <td className="history-probability">
                        {item.failure_probability}%
                      </td>

                      <td>
                        <span
                          className={`history-risk ${getRiskClass(
                            item.risk_level
                          )}`}
                        >
                          {item.risk_level}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            item.prediction === 1
                              ? "history-failure"
                              : "history-normal"
                          }
                        >
                          {item.prediction === 1
                            ? "FAILURE"
                            : "NORMAL"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Analytics */}
        <section className="analytics-grid">
          {/* Failure Distribution */}
          <div className="card analytics-card">
            <div className="card-header">
              <div>
                <p className="section-label">ANALYTICS</p>
                <h3>Prediction Distribution</h3>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="analytics-empty">
                Run predictions to generate analytics.
              </div>
            ) : (
              <div className="chart-content">
                <div className="metric-row">
                  <div className="metric-label">
                    <span>Normal</span>
                    <strong>{normalCount}</strong>
                  </div>

                  <div className="bar-track">
                    <div
                      className="bar-normal"
                      style={{ width: `${normalPercentage}%` }}
                    ></div>
                  </div>

                  <small>{normalPercentage}%</small>
                </div>

                <div className="metric-row">
                  <div className="metric-label">
                    <span>Failure</span>
                    <strong>{failureCount}</strong>
                  </div>

                  <div className="bar-track">
                    <div
                      className="bar-failure"
                      style={{ width: `${failurePercentage}%` }}
                    ></div>
                  </div>

                  <small>{failurePercentage}%</small>
                </div>

                <div className="failure-rate-box">
                  <span>Overall Failure Rate</span>
                  <strong>{failureRate}%</strong>
                </div>
              </div>
            )}
          </div>

          {/* Risk Distribution */}
          <div className="card analytics-card">
            <div className="card-header">
              <div>
                <p className="section-label">RISK ANALYSIS</p>
                <h3>Risk Distribution</h3>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="analytics-empty">
                Run predictions to generate risk analytics.
              </div>
            ) : (
              <div className="chart-content">
                <div className="metric-row">
                  <div className="metric-label">
                    <span>LOW</span>
                    <strong>{lowRiskCount}</strong>
                  </div>

                  <div className="bar-track">
                    <div
                      className="bar-low"
                      style={{ width: `${lowRiskPercentage}%` }}
                    ></div>
                  </div>

                  <small>{lowRiskPercentage}%</small>
                </div>

                <div className="metric-row">
                  <div className="metric-label">
                    <span>MEDIUM</span>
                    <strong>{mediumRiskCount}</strong>
                  </div>

                  <div className="bar-track">
                    <div
                      className="bar-medium"
                      style={{ width: `${mediumRiskPercentage}%` }}
                    ></div>
                  </div>

                  <small>{mediumRiskPercentage}%</small>
                </div>

                <div className="metric-row">
                  <div className="metric-label">
                    <span>HIGH</span>
                    <strong>{highRiskCount}</strong>
                  </div>

                  <div className="bar-track">
                    <div
                      className="bar-high"
                      style={{ width: `${highRiskPercentage}%` }}
                    ></div>
                  </div>

                  <small>{highRiskPercentage}%</small>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Statistics */}
        <section className="stats-row">
          <div className="stat-card">
            <span>TOTAL PREDICTIONS</span>
            <strong>{totalPredictions}</strong>
            <small>Analyses completed</small>
          </div>

          <div className="stat-card">
            <span>FAILURES DETECTED</span>
            <strong>{failuresDetected}</strong>
            <small>Machines flagged</small>
          </div>

          <div className="stat-card">
            <span>HIGH RISK</span>
            <strong>{highRiskCount}</strong>
            <small>Immediate attention</small>
          </div>

          <div className="stat-card">
            <span>AVG PROBABILITY</span>
            <strong>{averageProbability}%</strong>
            <small>Across all predictions</small>
          </div>
        </section>


      </main>

      <footer>
        PredictX • AI-Based Predictive Maintenance System
      </footer>
    </div>
  );
}

export default App;