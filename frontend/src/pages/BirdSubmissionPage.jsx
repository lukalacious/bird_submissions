import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBirds } from '../contexts/BirdContext';
import { useAuth } from '../contexts/AuthContext';
import { birdService } from '../services/birdService';
import BirdList from '../components/BirdList/BirdList';
import './BirdSubmissionPage.css';

function BirdSubmissionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    region,
    birds,
    setBirds,
    selectedBirds,
    toggleBird,
    canSelectMore,
    selectedCount,
    maxBirds,
    clearSelection
  } = useBirds();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!region) {
      navigate('/region');
      return;
    }
    loadBirds();
  }, [region]);

  const loadBirds = async () => {
    try {
      setLoading(true);
      setError(null);
      const birdsData = await birdService.getBirdsByRegion(region);
      setBirds(birdsData);
    } catch (err) {
      console.error('Error loading birds:', err);
      setError('Failed to load birds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedCount === 0) {
      alert('Please select at least one bird');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to submit ${selectedCount} bird(s)? Once submitted, these birds cannot be selected again.`
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const birdArray = Array.from(selectedBirds);
      const result = await birdService.submitBirds(region, birdArray);

      if (result.success) {
        navigate('/success', {
          state: { submissionCount: selectedCount, region }
        });
      } else {
        setError(result.errors?.join(', ') || 'Submission failed');
      }
    } catch (err) {
      console.error('Error submitting birds:', err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.errors?.join(', ') ||
          'Failed to submit birds. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (selectedCount > 0) {
      if (
        !window.confirm(
          'You have unsaved selections. Are you sure you want to go back?'
        )
      ) {
        return;
      }
      clearSelection();
    }
    navigate('/region');
  };

  if (loading) {
    return (
      <div className="submission-page">
        <div className="loading-message">Loading birds...</div>
      </div>
    );
  }

  return (
    <div className="submission-page">
      <div className="submission-container">
        <header className="submission-header">
          <div>
            <h1>Select Birds - {region}</h1>
            <p className="user-greeting">Logged in as {user?.name}</p>
          </div>
          <button className="back-btn" onClick={handleBack}>
            ← Change Region
          </button>
        </header>

        <div className="selection-info">
          <div className="counter">
            <span className="count">{selectedCount}</span>
            <span className="max">/ {maxBirds}</span>
            <span className="label">birds selected</span>
          </div>

          {selectedCount === maxBirds && (
            <div className="limit-warning">
              Maximum limit reached! Unselect a bird to choose a different one.
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="submission-actions">
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={selectedCount === 0 || submitting}
          >
            {submitting ? 'Submitting...' : `Submit ${selectedCount} Bird(s)`}
          </button>
          <button
            className="clear-btn"
            onClick={clearSelection}
            disabled={selectedCount === 0 || submitting}
          >
            Clear Selection
          </button>
        </div>

        <BirdList
          birds={birds}
          selectedBirds={selectedBirds}
          canSelectMore={canSelectMore}
          onToggleBird={toggleBird}
        />

        <div className="submission-actions">
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={selectedCount === 0 || submitting}
          >
            {submitting ? 'Submitting...' : `Submit ${selectedCount} Bird(s)`}
          </button>
          <button
            className="clear-btn"
            onClick={clearSelection}
            disabled={selectedCount === 0 || submitting}
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
}

export default BirdSubmissionPage;
