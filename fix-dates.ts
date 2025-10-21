/**
 * One-time script to fix incorrect dates in health entries
 * Run this in the browser console on your app page:
 * 
 * 1. Open your app in the browser
 * 2. Open Developer Console (F12)
 * 3. Paste this code and run it
 */

// This is the code to paste in browser console:
/*

// Get your user ID (it will be in the React DevTools or you can see it in the logs)
const userId = "k178j40ff8e2m36e6kjm0wp6dh7sr439"; // Replace with your actual user ID

// Call the mutation using Convex client
const convex = window.__CONVEX_CLIENT__;
if (convex) {
  convex.mutation("healthEntries:fixIncorrectDates", {
    userId: userId,
    wrongDate: "2025-10-20",
    correctDate: "2025-10-19"
  }).then(result => {
    console.log("✅ Migration complete:", result);
  }).catch(error => {
    console.error("❌ Migration failed:", error);
  });
} else {
  console.error("Convex client not found");
}

*/

export { }; // Make this a module

