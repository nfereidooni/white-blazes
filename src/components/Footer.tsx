const BTC = {
  donate: "https://brucetrail.org/donations/",
  member: "https://brucetrail.org/become-a-member/",
  app: "https://brucetrail.org/bruce-trail-app/",
};

const NewTab = () => <span className="sr-only"> (opens in a new tab)</span>;

/** Support for the Bruce Trail Conservancy, the trail data credit, and a navigation warning. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="support">
        <p>Love the Bruce Trail?</p>
        <div className="support-links">
          <a href={BTC.donate} target="_blank" rel="noopener noreferrer" className="button-support">
            Donate to the Bruce Trail Conservancy
            <NewTab />
          </a>
          <a href={BTC.member} target="_blank" rel="noopener noreferrer" className="button-support">
            Become a member
            <NewTab />
          </a>
        </div>
      </div>
      <p className="fineprint">
        Trail line from OpenStreetMap, October 2026, and not for navigation. On the trail, use the{" "}
        <a href={BTC.app} target="_blank" rel="noopener noreferrer">
          Bruce Trail App
          <NewTab />
        </a>{" "}
        for the official route and closures. White Blazes isn&rsquo;t affiliated with the Bruce Trail Conservancy. Trail
        data ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors
          <NewTab />
        </a>
        .
      </p>
    </footer>
  );
}
