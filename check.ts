async function check() {
  try {
    const res = await fetch("http://localhost:3000/api/members/123", {
      method: "DELETE",
      headers: {
        "x-user-name": "Test User",
        "x-user-id": "test-id"
      }
    });
    console.log("Delete:", await res.json());

    const res2 = await fetch("http://localhost:3000/api/logs");
    const data = await res2.json();
    console.log("Logs:", data);
  } catch (err) {
    console.error(err);
  }
}
check();
