import React from "react";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import "./InfoBanner.scss";

const InfoBanner = ({ type = "success", text, ButtonComponent }) => {
  return (
    <div className={`info_banner ${type}`}>
      <div className="icon">
        {type === "success" && <CheckCircle />}
        {type === "error" && <AlertCircle />}
        {type === "info" && <Info />}
      </div>
      <div className="text">{text}</div>
      {ButtonComponent && <div className="button">{ButtonComponent}</div>}
    </div>
  );
};

export default InfoBanner;