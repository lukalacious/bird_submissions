import React from 'react';
import BirdCheckbox from './BirdCheckbox';
import './BirdList.css';

function BirdList({ birds, selectedBirds, canSelectMore, onToggleBird }) {
  if (!birds || birds.length === 0) {
    return (
      <div className="no-birds">
        <p>No birds available for this region.</p>
      </div>
    );
  }

  return (
    <div className="bird-list">
      <div className="bird-grid">
        {birds.map((bird) => (
          <BirdCheckbox
            key={bird.id}
            bird={bird}
            isSelected={selectedBirds.has(bird.fullName)}
            isDisabled={bird.isDisabled}
            canSelect={canSelectMore}
            onToggle={onToggleBird}
          />
        ))}
      </div>
    </div>
  );
}

export default BirdList;
