/** Required credit for the OpenStreetMap trail data (ODbL). */
export function Footer() {
  return (
    <footer className="site-footer">
      Trail data ©{" "}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
        OpenStreetMap contributors<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </footer>
  );
}
