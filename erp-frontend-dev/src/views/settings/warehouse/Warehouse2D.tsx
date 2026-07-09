import React, { useState } from 'react';
import { Box, Button } from '@mui/material';

interface Rack {
    id: number;
    rack_number: number;
    number_of_bins: number;
    location_x: number;
    location_y: number;
}

interface Warehouse2DProps {
    racks: Rack[];
}

const Warehouse2D: React.FC<Warehouse2DProps> = ({ racks }) => {
    const [selectedRack, setSelectedRack] = useState<Rack | null>(null);

    // Find the maximum x and y coordinates to scale the view
    const maxX = Math.max(...racks.map(rack => rack.location_x), 50);
    const maxY = Math.max(...racks.map(rack => rack.location_y), 50);

    const handleRackClick = (rack: Rack) => {
        setSelectedRack(rack);
    };

    const handleCloseDialog = () => {
        setSelectedRack(null);
    };

    return (
        <Box
            sx={{
                width: '100%',
                height: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                bgcolor: '#fff',
                p: 2,
                borderRadius: 1,
                border: '1px solid #ccc',
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: '600px',
                    overflowX: 'auto',
                    position: 'relative',
                }}
            >
                {/* Grid */}
                <div
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        backgroundSize: `${100 / maxX}% ${100 / maxY}%`,
                        backgroundImage: 'linear-gradient(to right, #eee 1px, transparent 1px), linear-gradient(to bottom, #eee 1px, transparent 1px)',
                    }}
                />

                {/* Racks */}
                {racks.map((rack) => {
                    const xPercent = (rack.location_x / maxX) * 100;
                    const yPercent = (rack.location_y / maxY) * 100;

                    return (
                        <div
                            key={rack.id}
                            style={{
                                position: 'absolute',
                                left: `calc(${xPercent}% - 15px)`,
                                top: `calc(${yPercent}% - 15px)`,
                                width: '30px',
                                height: '30px',
                                backgroundColor: '#2196f3',
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: '4px',
                                fontSize: '12px',
                                textAlign: 'center',
                                cursor: 'pointer',
                            }}
                            title={`Rack ${rack.rack_number}\nBins: ${rack.number_of_bins}`}
                            onClick={() => handleRackClick(rack)}
                        >
                            R{rack.rack_number}
                        </div>
                    );
                })}

                {/* X-axis Label */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '12px',
                        color: '#000',
                    }}
                >
                    X Position
                </div>

                {/* Y-axis Label */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '10px',
                        transform: 'translateY(-50%) rotate(-90deg)',
                        fontSize: '12px',
                        color: '#000',
                    }}
                >
                    Y Position
                </div>
            </Box>

            {/* Rack Data Section */}
            {selectedRack && (
                <Box
                    sx={{
                        width: '100%',
                        mt: 2,
                        p: 2,
                        bgcolor: '#f5f5f5',
                        borderRadius: 1,
                        border: '1px solid #ddd',
                    }}
                >
                    <h2>Rack Details</h2>
                    <p>Rack Number: {selectedRack.rack_number}</p>
                    <p>Number of Bins: {selectedRack.number_of_bins}</p>
                    <p>Location X: {selectedRack.location_x}</p>
                    <p>Location Y: {selectedRack.location_y}</p>
                </Box>
            )}
        </Box>
    );
};

export default Warehouse2D;