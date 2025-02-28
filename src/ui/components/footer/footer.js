import React from "react";
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./footer.css";

export const Footer = () => {
  return (
    <div>
      <>
        {/* FOOTER */}
        <div className="footer">
          <div className="about">
            <h3>About</h3>
            <a href="/#">About Us</a>
            <a href="/#">How it works</a>
            <a href="/#">FAQs</a>
          </div>
          <div className="terms">
            <h3>Our Policy</h3>
            <a href="/#">Terms &amp; Condition</a>
            <a href="/#">Return Policy</a>
            <a href="/#">Privacy Policy</a>
            <a href="/#">Cookie Policy</a>
          </div>
          <div className="social">
            <h3>Connect</h3>
            <a href="/#" className="fab fa-facebook-f" aria-label="Facebook" />
            <a href="/#" className="fab fa-twitter" aria-label="Twitter" />
            <a href="/#" className="fab fa-youtube" aria-label="YouTube" />
            <a href="/#" className="fab fa-instagram" aria-label="Instagram" />
            <a href="/#" className="fab fa-pinterest" aria-label="Pinterest" />
          </div>
        </div>
      </>
    </div>
  );
};
