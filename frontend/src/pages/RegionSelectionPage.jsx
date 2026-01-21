import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBirds } from '../contexts/BirdContext';
import { useAuth } from '../contexts/AuthContext';
import { birdService } from '../services/birdService';
import './RegionSelectionPage.css';

function RegionSelectionPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setRegion } = useBirds();
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    try {
      setLoading(true);
      const regionsData = await birdService.getRegions();
      setRegions(regionsData);
      setError(null);
    } catch (err) {
      console.error('Error loading regions:', err);
      setError('Failed to load regions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegionSelect = (regionName) => {
    setRegion(regionName);
    navigate('/submit');
  };

  const formatRegionName = (regionName) => {
    return regionName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="region-page">
        <div className="loading">Loading regions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="region-page">
        <div className="error">
          <p>{error}</p>
          <button onClick={loadRegions}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="region-page">
      <header className="page-header">
        <div className="user-info">
          <span>Welcome, {user?.name}!</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="region-container">
        <h1>Select Your Region</h1>
        <p className="instruction">Choose the region where you spotted the birds</p>

        <div className="region-grid">
          {regions.map((regionName) => (
            <div
              key={regionName}
              className="region-card"
              onClick={() => handleRegionSelect(regionName)}
            >
              <h3>{formatRegionName(regionName)}</h3>
              <button className="select-btn">Select Region</button>
            </div>
          ))}
        </div>

        {regions.length === 0 && (
          <div className="no-regions">
            <p>No regions available. Please contact the administrator.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegionSelectionPage;
