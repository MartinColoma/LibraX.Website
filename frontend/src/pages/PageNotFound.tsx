import React from 'react';
import './PageNotFound.css';

// Icon components (you can replace these with your preferred icon library)
const BookIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
  </svg>
);

const HomeIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const BookOpenIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zM3 18.5V7c1.1-.35 2.3-.5 3.5-.5 1.34 0 3.13.41 4.5.99v11.5C9.63 18.41 7.84 18 6.5 18c-1.2 0-2.4.15-3.5.5zm18 0c-1.1-.35-2.3-.5-3.5-.5-1.34 0-3.13.41-4.5.99V7.49c1.37-.58 3.16-.99 4.5-.99 1.2 0 2.4.15 3.5.5v11.5z"/>
  </svg>
);

const LibraryIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 17h14v2H5zm7-12L6 7v10h12V7l-6-2zM4 9l8-3 8 3v8c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V9zM8 11h8v2H8v-2zm0 4h8v2H8v-2z"/>
  </svg>
);

interface PageNotFoundProps {
  onHomeClick?: () => void;
}

const PageNotFound: React.FC<PageNotFoundProps> = ({ 
  onHomeClick = () => window.history.back()}) => {
  // Generate floating books with random positions
  const floatingBooks = Array.from({ length: 8 }, (_, i) => (
    <div
      key={i}
      className="floating-book"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`,
      }}
    >
      <BookIcon size={24 + Math.random() * 16} />
    </div>
  ));

  return (
    <div className="page-not-found">
      {/* Floating Books Background */}
      {floatingBooks}
      
      {/* Animated Background Circles */}
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>
      <div className="bg-circle bg-circle-3"></div>

      {/* Background Pattern */}
      <div className="background-pattern"></div>

      <div className="content">
        {/* Large Library Icon */}
        <div className="library-icon-container">
          <div className="library-icon">
            <LibraryIcon size={80} />
          </div>
        </div>

        {/* 404 Text */}
        <div>
          <h1 className="error-number">404</h1>
          <div className="chapter-header">
            <BookOpenIcon size={24} />
            <h2 className="chapter-title">Chapter Not Found</h2>
            <BookOpenIcon size={24} />
          </div>
        </div>

        {/* Description */}
        <div className="description">
          <p className="description-text">
            It seems this page has been checked out permanently or moved to a different section of our digital library.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            onClick={onHomeClick}
            className="btn btn-primary"
          >
            <HomeIcon size={20} />
            Return Home
            <div className="btn-indicator"></div>
          </button>
        </div>

        {/* Footer Message */}
        <div className="footer-quote">
          <p className="quote-text">
            <BookIcon size={16} />
            "A library is not a luxury but one of the necessities of life"
            <BookIcon size={16} />
          </p>
          <p className="quote-author">— Henry Ward Beecher</p>
        </div>
      </div>
    </div>
  );
};

export default PageNotFound;