import React from 'react'
import QRCode from "react-qr-code";

const RitzQR = ({value,size}: any) => {
  return (
    <QRCode
    size={size}
    style={{ height: "100%", width: "100%" }}
    value={value}
    viewBox={`0 0 256 256`}
    />
  )
}

export default RitzQR;
