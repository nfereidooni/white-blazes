import Link from "next/link";
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
        <div className="support-text">
          <p>Love the Bruce Trail?</p>
          <p className="support-note">
            The Bruce Trail Conservancy is a registered Canadian charity (No. 119217578RR0001). Donations and
            memberships get a charitable tax receipt.
          </p>
        </div>
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
        White Blazes isn&rsquo;t affiliated with or endorsed by the Bruce Trail Conservancy. The trail line comes from
        OpenStreetMap (October 2026), and km are measured along it and scaled to the Conservancy&rsquo;s published section
        lengths, so they can differ from the Bruce Trail Reference. It&rsquo;s not for navigation: on the trail, use the{" "}
        <a href={BTC.app} target="_blank" rel="noopener noreferrer">
          Bruce Trail App
          <NewTab />
        </a>{" "}
        for the official route and closures. Trail data ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors
          <NewTab />
        </a>
        , available under the Open Database License.
      </p>
      <p className="fineprint footer-legal">
        © {new Date().getFullYear()} Niki Fereidooni · <Link href="/privacy">Privacy policy</Link>
      </p>
    </footer>
  );
}
