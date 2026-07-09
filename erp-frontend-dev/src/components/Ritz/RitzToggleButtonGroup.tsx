import React, { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';

const RitzToggleButtonGroup = ({ dataSet, selectType, onTypeChange }: any) => {

  const [selectedType, setSelectedType] = useState<any>(selectType || 'all');

  const handlePlantSelection = (event: any, newType: any) => {
    setSelectedType(newType);
    onTypeChange(newType);
  };

  return (
    <Box>
      <ToggleButtonGroup
        color="primary"
        value={selectedType}
        exclusive
        onChange={handlePlantSelection}
        aria-label="Platform"
        sx={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}
      >
        {dataSet.map((category: any, categoryIndex: any) =>
          <ToggleButton
            key={categoryIndex}
            style={{ marginRight: '10px', height: '4em', border: `1px solid #E0E0E0`, borderRadius: '5px',  marginBottom: '10px', }}
            value={category?.id}
          >
            <Box>
              {category?.display_name}
            </Box>
          </ToggleButton>
        )}
      </ToggleButtonGroup>
    </Box>
  );
};

export default RitzToggleButtonGroup;