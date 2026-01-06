import { useEffect, useState } from "react";

function App() {
  const [role, setRole] = useState(null); // "commander" or "cadet"
  const [commanders, setCommanders] = useState([]);
  const [selectedCommander, setSelectedCommander] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from backend
    fetch("http://localhost:8000/commanders")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        setCommanders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Could not load data from backend");
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20 }}>{error}</div>;

  return (
    <div style={{ padding: 20 }}>
      {!role && (
        <>
          <h1>Choose Your Role</h1>
          <button onClick={() => setRole("commander")}>Commander</button>{" "}
          <button onClick={() => setRole("cadet")}>Cadet</button>
        </>
      )}

      {role === "commander" && (
        <>
          <h2>Commanders</h2>
          {commanders.map((c) => (
            <div
              key={c.id}
              style={{
                cursor: "pointer",
                border: "1px solid gray",
                padding: 8,
                margin: 5,
              }}
              onClick={() => setSelectedCommander(c)}
            >
              {c.name} ({c.cadets.length} cadets)
            </div>
          ))}

          {selectedCommander && (
            <div style={{ marginTop: 15 }}>
              <h3>Cadets under {selectedCommander.name}</h3>
              {selectedCommander.cadets.length === 0 ? (
                <p>No cadets assigned</p>
              ) : (
                <ul>
                  {selectedCommander.cadets.map((cd) => (
                    <li key={cd.id}>{cd.name}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {role === "cadet" && (
        <>
          <h2>Cadet View</h2>
          <p>
            As a cadet, you will see your assigned commander here. This data
            comes from the backend.
          </p>
        </>
      )}
    </div>
  );
}

export default App;
