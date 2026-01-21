import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBirds } from '../contexts/BirdContext';
import './SuccessPage.css';

function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSelection, resetState } = useBirds();

  const { submissionCount, region } = location.state || {};

  const handleSubmitMore = () => {
    clearSelection();
    navigate('/region');
  };

  const handleViewSubmissions = () => {
    // Could add a submissions history page in the future
    alert('Submissions history feature coming soon!');
  };

  const handleDone = () => {
    resetState();
    navigate('/region');
  };

  if (!submissionCount) {
    return (
      <div className="success-page">
        <div className="success-container">
          <p>No submission data found.</p>
          <button onClick={() => navigate('/region')}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">✓</div>
        <h1>Submission Successful!</h1>
        <p className="success-message">
          You've successfully submitted <strong>{submissionCount} bird(s)</strong> for{' '}
          <strong>{region}</strong>.
        </p>

        <div className="info-box">
          <h3>What's Next?</h3>
          <ul>
            <li>Your submitted birds have been saved to your account</li>
            <li>These birds are now marked and cannot be resubmitted</li>
            <li>You can submit more birds from the same or different regions</li>
          </ul>
        </div>

        <div className="action-buttons">
          <button className="primary-btn" onClick={handleSubmitMore}>
            Submit More Birds
          </button>
          <button className="secondary-btn" onClick={handleDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuccessPage;
