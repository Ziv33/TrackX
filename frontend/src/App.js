import { useEffect, useState } from "react";

function App() {
  const [role, setRole] = useState(null); // "commander" | "cadet"
  const [commanders, setCommanders] = useState([]);
  const [selectedCommander, setSelectedCommander] = useState(null);

  useEffect(() => {
    // Fetch from backend if exists
    fetch("http://localhost:8000/commanders")
      .then((res) => res.json())
      .then((data) => setCommanders(data))
      .catch(() => {
        // fallback mock data
        setCommanders([
          {
            id: 1,
            name: "Commander Alpha",
            cadets: [
              { id: 1, name: "Cadet One" },
              { id: 2, name: "Cadet Two" },
            ],
          },
          {
            id: 2,
            name: "Commander Bravo",
            cadets: [{ id: 3, name: "Cadet Three" }],
          },
        ]);
      });
  }, []);

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
              <ul>
                {selectedCommander.cadets.map((cd) => (
                  <li key={cd.id}>{cd.name}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {role === "cadet" && (
        <>
          <h2>Cadet View</h2>
          <p>
            As a cadet, you are assigned to a commander. In a real app, this
            would be determined by login.
          </p>
        </>
      )}
    </div>
  );
}

export default App;
