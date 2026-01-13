import React from "react";
import { Skeleton } from "@mui/material";
import "./BookingCardSkeleton.scss";

const BookingCardSkeleton = () => (
  <div className="booking-card-skeleton">
    <Skeleton variant="rectangular" width="100%" height={24} />
    <Skeleton variant="text" width="60%" />
    <Skeleton variant="text" width="80%" />
    <Skeleton variant="rectangular" width="100%" height={40} />
    <div className="skeleton-actions">
      <Skeleton variant="rectangular" width={80} height={32} />
      <Skeleton variant="rectangular" width={80} height={32} />
    </div>
  </div>
);

const BookingSkeletonList = ({ count = 6 }) => (
  <div className="cards-list">
    {Array.from({ length: count }).map((_, idx) => (
      <BookingCardSkeleton key={idx} />
    ))}
  </div>
);

export default BookingSkeletonList;