export async function updateAbout(about: string) {
  const res = await fetch(
    "/api/connect/v1/profile/me/update/about",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ about }),
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Failed to update about");
  }

  return json;
}
