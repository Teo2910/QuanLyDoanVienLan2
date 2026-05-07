async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/logs");
    const data = await res.json();
    console.log("Logs API:", data);

    const checkRes = await fetch("http://localhost:3000/api/test-logs");
    const checkData = await checkRes.json();
    console.log("Check API:", checkData);
  } catch (err) {
    console.error(err);
  }
}
test();
