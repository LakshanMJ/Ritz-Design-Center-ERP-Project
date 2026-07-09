import React from 'react';
import { TablePagination, Box, IconButton } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface RitzTablePaginationProps {
    count: number;
    page: number;
    rowsPerPage: number;
    onPageChange: (event: any | null, newPage: number) => void;
    onRowsPerPageChange: (event: any) => void;
    next?: string | null;
}

const RitzTablePagination = ({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange, next }: RitzTablePaginationProps) => {
    return (
        <Box>
            <TablePagination
                rowsPerPageOptions={[50, 100, 150]}
                component="div"
                count={count}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                showFirstButton
                showLastButton
                nextIconButtonProps={{ disabled: !next }}
                backIconButtonProps={{ disabled: page === 0 }}
            />
        </Box>
    );
};

export default RitzTablePagination;