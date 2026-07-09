import React from 'react';
import { Box, Typography } from '@mui/material';

const printStyles = {
  display: 'none', 
  '@media print': {
    display: 'flex',
  },
};

const PrintRitzHeader = ({ logoPath, title }: any) => {
  return (
    <Box
      className="print-only"
      sx={{
        ...printStyles,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 2,
        mb: 2,
      }}
    >
      {logoPath && (
        <Box
          component="img"
          src={logoPath}
          alt="logo"
          sx={{
            height: 100,
            borderRadius: '8px',
            objectFit: 'cover',
          }}
        />
      )}
      <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
        <Typography variant="h2" component="div" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
      </Box>
    </Box>
  );
};

export default PrintRitzHeader;