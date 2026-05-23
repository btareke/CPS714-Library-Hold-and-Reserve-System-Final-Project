// src/App.js
// Simple testing interface for holds and reservations

import React, { useState, useEffect } from 'react';
import {
  placeHold,
  placeReservation,
  getUserHolds,
  getUserReservations,
  cancelHold,
  cancelReservation,
  getAllHolds,
  getAllReservations,
  startExpirationJob,
  stopExpirationJob,
  isExpirationJobRunning,
  expireOldReservations
} from './services/holdsService';
import './App.css';

function App() {
  const [userId, setUserId] = useState('user1'); // Default to Project 4's mock user
  const [itemId, setItemId] = useState('BK-1001'); // Default to a book ID
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [holdId, setHoldId] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [expirationJobStatus, setExpirationJobStatus] = useState(false);

  // Start automated expiration job on component mount
  useEffect(() => {
    // Start expiration job to run every 60 minutes
    startExpirationJob(60);
    setExpirationJobStatus(true);

    // Cleanup on unmount
    return () => {
      stopExpirationJob();
      setExpirationJobStatus(false);
    };
  }, []);

  const handleOperation = async (operation) => {
    setLoading(true);
    setResult(null);

    try {
      let response;

      switch(operation) {
        case 'placeHold':
          response = await placeHold(userId, itemId);
          break;
        case 'placeReservation':
          response = await placeReservation(userId, itemId);
          break;
        case 'getUserHolds':
          response = await getUserHolds(userId);
          break;
        case 'getUserReservations':
          response = await getUserReservations(userId);
          break;
        case 'cancelHold':
          response = await cancelHold(holdId);
          break;
        case 'cancelReservation':
          response = await cancelReservation(reservationId);
          break;
        case 'getAllHolds':
          response = await getAllHolds();
          break;
        case 'getAllReservations':
          response = await getAllReservations();
          break;
        case 'expireReservations':
          response = await expireOldReservations();
          break;
        case 'toggleExpirationJob':
          if (isExpirationJobRunning()) {
            stopExpirationJob();
            setExpirationJobStatus(false);
            response = { success: true, message: 'Expiration job stopped' };
          } else {
            startExpirationJob(60);
            setExpirationJobStatus(true);
            response = { success: true, message: 'Expiration job started (runs every 60 minutes)' };
          }
          break;
        default:
          response = { error: 'Unknown operation' };
      }

      setResult(response);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Holds & Reservations System</h1>
        <p>Sub-Project 3: Database Manager</p>
      </header>

      <div className="input-section">
        <h2>Input Parameters</h2>

        <div className="input-group">
          <label>User ID (from Project 4):</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., user1, user2, user3, user4"
          />
          <small>Use: user1, user2, user3, or user4 (from Project 4 mock data)</small>
        </div>

        <div className="input-group">
          <label>Item ID (from Project 2 Catalog):</label>
          <input
            type="text"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="e.g., BK-1001, BK-2002"
          />
          <small>Use: BK-1001 to BK-5002 (from Project 4 mock loans)</small>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Hold ID (for cancel):</label>
            <input
              type="text"
              value={holdId}
              onChange={(e) => setHoldId(e.target.value)}
              placeholder="Hold document ID"
            />
          </div>

          <div className="input-group">
            <label>Reservation ID (for cancel):</label>
            <input
              type="text"
              value={reservationId}
              onChange={(e) => setReservationId(e.target.value)}
              placeholder="Reservation document ID"
            />
          </div>
        </div>
      </div>

      <div className="operations">
        <h2>Operations</h2>

        <div className="button-section">
          <h3>Create</h3>
          <div className="button-grid">
            <button onClick={() => handleOperation('placeHold')} className="btn-primary">
              Place Hold
            </button>
            <button onClick={() => handleOperation('placeReservation')} className="btn-primary">
              Place Reservation
            </button>
          </div>
        </div>

        <div className="button-section">
          <h3>Read</h3>
          <div className="button-grid">
            <button onClick={() => handleOperation('getUserHolds')} className="btn-secondary">
              Get User Holds
            </button>
            <button onClick={() => handleOperation('getUserReservations')} className="btn-secondary">
              Get User Reservations
            </button>
            <button onClick={() => handleOperation('getAllHolds')} className="btn-secondary">
              Get All Holds (Admin)
            </button>
            <button onClick={() => handleOperation('getAllReservations')} className="btn-secondary">
              Get All Reservations (Admin)
            </button>
          </div>
        </div>

        <div className="button-section">
          <h3>Delete</h3>
          <div className="button-grid">
            <button onClick={() => handleOperation('cancelHold')} className="btn-danger">
              Cancel Hold
            </button>
            <button onClick={() => handleOperation('cancelReservation')} className="btn-danger">
              Cancel Reservation
            </button>
          </div>
        </div>

        <div className="button-section">
          <h3>Maintenance</h3>
          <div className="button-grid">
            <button onClick={() => handleOperation('expireReservations')} className="btn-secondary">
              Expire Old Reservations (Manual)
            </button>
            <button onClick={() => handleOperation('toggleExpirationJob')} className="btn-secondary">
              {expirationJobStatus ? 'Stop' : 'Start'} Auto-Expiration Job
            </button>
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: '#666' }}>
            Auto-expiration job: {expirationJobStatus ? 'Running (every 60 min)' : 'Stopped'}
          </small>
        </div>
      </div>

      {loading && <div className="loading">⏳ Processing...</div>}

      {result && (
        <div className={`result ${result.success === false ? 'error' : 'success'}`}>
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <footer>
        <h3>Quick Reference</h3>
        <div className="reference">
          <div>
            <strong>Available Mock Users (Project 4):</strong>
            <ul>
              <li>user1 - Jane Doe</li>
              <li>user2 - Alex Nguyen</li>
              <li>user3 - Sarah Kim</li>
              <li>user4 - Michael Reid</li>
            </ul>
          </div>
          <div>
            <strong>Available Mock Books (Project 4 loans):</strong>
            <ul>
              <li>BK-1001 - Mockingjay</li>
              <li>BK-2002 - The Maze Runner</li>
              <li>BK-3003 - Divergent</li>
              <li>BK-4001 - Clean Code</li>
              <li>BK-5001 - The Silent Patient</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
