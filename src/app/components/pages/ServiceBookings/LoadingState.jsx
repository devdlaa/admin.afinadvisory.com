import React from "react";
import { CircularProgress } from "@mui/material";
import "./LoadingState.scss";

const LoadingState = ({ message = "Loading bookings..." }) => (
  <div className="loading-state">
    <CircularProgress size={32} />
    <p>{message}</p>
  </div>
);

export default LoadingState;