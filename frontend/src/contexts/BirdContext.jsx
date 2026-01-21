import React, { createContext, useState, useContext } from 'react';

const BirdContext = createContext();

export const useBirds = () => {
  const context = useContext(BirdContext);
  if (!context) {
    throw new Error('useBirds must be used within BirdProvider');
  }
  return context;
};

export const BirdProvider = ({ children }) => {
  const [region, setRegion] = useState(null);
  const [birds, setBirds] = useState([]);
  const [selectedBirds, setSelectedBirds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const MAX_BIRDS = 31;

  const toggleBird = (birdCommonName) => {
    setSelectedBirds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(birdCommonName)) {
        newSet.delete(birdCommonName);
      } else {
        if (newSet.size < MAX_BIRDS) {
          newSet.add(birdCommonName);
        }
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedBirds(new Set());
  };

  const resetState = () => {
    setRegion(null);
    setBirds([]);
    setSelectedBirds(new Set());
    setError(null);
  };

  const canSelectMore = selectedBirds.size < MAX_BIRDS;

  const value = {
    region,
    setRegion,
    birds,
    setBirds,
    selectedBirds,
    toggleBird,
    clearSelection,
    resetState,
    canSelectMore,
    selectedCount: selectedBirds.size,
    maxBirds: MAX_BIRDS,
    loading,
    setLoading,
    error,
    setError
  };

  return <BirdContext.Provider value={value}>{children}</BirdContext.Provider>;
};

export default BirdContext;
