import React from 'react';
import './BirdCheckbox.css';

function BirdCheckbox({ bird, isSelected, isDisabled, canSelect, onToggle }) {
  const handleClick = () => {
    if (bird.isDisabled) return; // Can't select previously submitted birds
    if (!isSelected && !canSelect) return; // Can't select more than 31
    onToggle(bird.fullName);
  };

  const checkboxDisabled = bird.isDisabled || (!isSelected && !canSelect);

  return (
    <div
      className={`bird-checkbox ${isSelected ? 'selected' : ''} ${bird.isDisabled ? 'previously-submitted' : ''} ${
        checkboxDisabled && !bird.isDisabled ? 'limit-reached' : ''
      }`}
    >
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleClick}
          disabled={checkboxDisabled}
        />
        <div className="bird-info">
          <span className="common-name">{bird.fullName}</span>
          <span className="scientific-name">{bird.scientificName}</span>
          {bird.isDisabled && (
            <span className="submitted-badge">Already Submitted</span>
          )}
        </div>
      </label>
    </div>
  );
}

export default BirdCheckbox;
