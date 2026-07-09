import { useState } from "react";
import { Box, IconButton } from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";

const RitzMultipleImagePreview = ({ images = [] }: any) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrevImage = () => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    };

    const handleNextImage = () => {
        setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1));
    };

    if (!images.length) return null;

    return (
        <Box sx={{ position: "relative", display: "inline-block" }}>
            <IconButton
                onClick={handlePrevImage}
                disabled={currentIndex === 0}
                sx={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }}
            >
                <ArrowBackIos />
            </IconButton>
            <img
                src={images[currentIndex]?.file_path}
                alt={'img'}
                style={{ width: "300px", height: "300px", borderRadius: "5px" }}
            />
            <IconButton
                onClick={handleNextImage}
                disabled={currentIndex === images.length - 1}
                sx={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}
            >
                <ArrowForwardIos />
            </IconButton>
        </Box>
    );
};

export default RitzMultipleImagePreview;