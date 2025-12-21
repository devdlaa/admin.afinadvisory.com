"use client";
import React, { useState } from "react";
import CustomButton from "@/app/components/newui/Button/CustomButton";
import CustomPopover from "@/app/components/newui/Popover/CustomPopover";
import { Rocket,Trash } from "lucide-react";
import "./style.scss";
const Page = () => {
  return (
    <div style={{ padding: "40px" }}>
      <CustomPopover
        trigger={<CustomButton text="Menu" variant="outline" />}
        width={280}
        closeOnClick
        align="start"
        className="popover_"
  
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "10px",
          }}
        >
          <p>Menu Items</p>
          <CustomButton icon={Rocket} className="btn_c" text="Edit" variant="ghost" />
          <CustomButton icon={Trash} className="btn_c" text="Duplicate" variant="ghost" />
          <CustomButton text="Delete" variant="danger" />
        </div>
      </CustomPopover>
    </div>
  );
};

export default Page;
