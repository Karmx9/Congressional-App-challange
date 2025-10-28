
import React from 'react';
import { GroundingResult } from '../types';

interface GroundingResultProps {
  results: GroundingResult[];
}

export const GroundingResultDisplay: React.FC<GroundingResultProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return null;
  }

  const searchResults = results.filter(r => r.web);
  const mapResults = results.filter(r => r.maps);

  return (
    <div className="mt-2 text-sm text-gray-600">
      {searchResults.length > 0 && (
        <div className="mb-2">
          <p className="font-semibold text-gray-700 mb-1">
            <i className="fas fa-search mr-2"></i>Web Sources:
          </p>
          <ul className="list-inside list-disc space-y-1">
            {searchResults.map((result, index) => (
              result.web && <li key={`web-${index}`}>
                <a href={result.web.uri} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                  {result.web.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {mapResults.length > 0 && (
         <div className="mb-2">
          <p className="font-semibold text-gray-700 mb-1">
            <i className="fas fa-map-marker-alt mr-2"></i>Places:
            <span className="font-normal text-xs text-gray-500 ml-2">(Booking feature is a simulation)</span>
          </p>
          <ul className="space-y-2">
            {mapResults.map((result, index) => (
              result.maps && <li key={`maps-${index}`} className="flex justify-between items-center">
                <a href={result.maps.uri} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                  {result.maps.title}
                </a>
                <a 
                  href={result.maps.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-blue-600 transition-colors"
                >
                  <i className="fas fa-calendar-check mr-1"></i>Book
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};