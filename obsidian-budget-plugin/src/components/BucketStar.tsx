import React, { useState } from "react";
import { BucketSummary } from "../models";

interface BucketStarProps {
    bucket: BucketSummary;
}

export const BucketStar: React.FC<BucketStarProps> = ({ bucket }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Calculate budget status
    const spent = bucket.total;
    const limit = bucket.allocation + bucket.rolloverCushion;
    const ratio = limit > 0 ? spent / limit : 0;
    const surplus = limit - spent;

    // Determine colors based on spending ratio
    let starColor = "#A8CBA0"; // Green by default
    let spentColor = "#A8CBA0";

    if (ratio >= 0.95) {
        starColor = "#E56565"; // Red
        spentColor = "#E56565";
    } else if (ratio >= 0.70) {
        starColor = "#F3F5A7"; // Yellow
        spentColor = "#F3F5A7";
    }

    return (
        <div 
            style={{ 
                position: "relative",
                width: "120px", // Base width for the star
                height: "96px",
                cursor: "pointer",
                fontFamily: "'Afacad', sans-serif"
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The Star SVG */}
            <div style={{ flexShrink: 0 }}>
                <svg width="80" height="96" viewBox="0 0 130 157" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                        d="M22.7787 20.4866L39.9522 62.309L42.7467 69.5523L36.9388 77.704L24.9901 90.8532C19.0811 97.131 6.04851 111.091 1.19067 116.706C-3.66718 122.322 18.588 111.014 21.8259 108.729C30.7399 102.463 34.3061 101.032 37.2328 99.7083C40.1595 98.3845 46.7852 96.815 47.5555 98.6183C48.3258 100.422 46.2804 122.238 46.2804 122.238L45.2351 156.271L56.9148 128.219L66.1884 103.464C66.1884 103.464 76.4304 107.312 79.0874 111.67C81.7443 116.029 89.121 132.614 89.9614 135.022C90.8018 137.43 98.7127 152.166 99.014 151.897C103.01 156.09 105.223 156.623 109.135 155.758C105.555 153.003 99.7703 138.633 97.9438 130.99C94.9386 117.632 91.5175 96.0058 92.7767 92.8284C93.41 91.2302 97.244 86.8674 103.142 83.9056C106.277 82.0859 110.922 78.0745 117.748 73.955C126.851 68.0236 128.911 69.1434 129.049 65.6504C129.507 63.5008 109.912 62.261 96.7059 61.109C90.7783 60.5919 86.2616 60.1979 85.6582 59.9472C84.9604 59.6574 85.2939 55.5098 85.776 49.5129L85.776 49.5126C86.256 43.5413 86.8835 35.7363 86.7872 28.0797C86.4087 24.4954 86.7168 20.5487 86.2324 15.9608L83.8318 0.0915053L80.8704 15.9783L78.3342 26.0729C78.3342 26.0729 73.0512 44.8969 70.012 50.4367C66.9727 55.9765 63.9922 56.5812 63.9922 56.5812L54.1263 46.8952L40.6218 32.9545L15.5887 1.81991L22.7787 20.4866Z" 
                        fill={starColor} 
                        stroke="black"
                        strokeWidth="2"
                    />
                </svg>
            </div>

            {/* The Text Block */}
            <div style={{ 
                position: "absolute",
                top: "10px", // Pushes the text down into the "L" groove
                left: "67px", // Pulls it left over the star's right boundary
                display: "flex", 
                flexDirection: "column", 
                zIndex: 1,
                whiteSpace: "nowrap"
            }}>
                {/* Title */}
                <div style={{ 
                    fontSize: "15px", 
                    color: "white", 
                    letterSpacing: "0.05em",
                    borderBottom: "2px solid white",
                    paddingBottom: "1px",
                    lineHeight: "1.2"
                }}>
                    {bucket.category}
                </div>

                {/* Values (only show if hovered, based on user preference from grill-me) */}
                <div style={{ 
                    display: "flex", 
                    justifyContent: "flex-end", 
                    alignItems: "baseline",
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "white",
                    opacity: isHovered ? 1 : 0,
                    transition: "opacity 0.2s ease"
                }}>
                    <span style={{ color: spentColor, fontWeight: "bold", marginRight: "4px" }}>
                        {spent.toFixed(0)}
                    </span>
                    <span style={{ marginRight: "4px" }}>
                        / {limit.toFixed(0)}$
                    </span>
                    <span>
                        {surplus >= 0 ? `+${surplus.toFixed(0)}` : surplus.toFixed(0)}
                    </span>
                </div>
            </div>
        </div>
    );
};
