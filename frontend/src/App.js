import { useState, useEffect } from "react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const CATEGORIES = ["Food", "Clean", "Sleep"];

function App() {
  const [username, setUsername] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = () => {
    setLoading(true);
    fetch(`http://localhost:8000/tasks/${username}`)
      .then(res => {
        if (!res.ok) throw new Error("No tasks found");
        return res.json();
      })
      .then(data => {
        setTasks(data.tasks);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  // Helper to get tasks for a cell
  const getTasks = (category, day) => {
    return tasks
      .filter(t => t.category === category && t.day === day)
      .map(t => t.slot);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Weekly Tasks</h1>
      <input
        placeholder="Enter username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <button onClick={fetchTasks}>Load Tasks</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {tasks.length > 0 && (
        <table border={1} cellPadding={5} style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Category</th>
              {DAYS.map(day => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat}>
                <td>{cat}</td>
                {DAYS.map(day => (
                  <td key={day}>
                    {getTasks(cat, day).map((slot, i) => (
                      <div key={i}>{slot}</div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
