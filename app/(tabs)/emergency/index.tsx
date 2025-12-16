import { Redirect } from "expo-router";

// Emergency tab now redirects to the unified Care page
// which includes 911, 811, and clinic finding in one place
export default function Emergency() {
  return <Redirect href="/find-care/clinics" />;
}
