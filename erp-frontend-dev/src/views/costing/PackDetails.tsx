
import { Box, Checkbox, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react'
import DefaultLoader from '@/components/DefaultLoader';
import ReviewStatus from '@/components/OrderInquiry/Costing/ReviewStatus';


const PackData = ({packItemData, selectedIds, onSelectedIdsChange, isLoading  }: any) => {
    const [selectAll, setSelectAll] = useState(false);
    const handleCheckboxChangess = (id: any) => {
        if (selectedIds.includes(id)) {
            onSelectedIdsChange((prevSelectedIds: any[]) => prevSelectedIds.filter((selectedId) => selectedId !== id));
        } else {
            onSelectedIdsChange((prevSelectedIds: any) => [...prevSelectedIds, id]);
        }
    };
    const handleSelectAllChange = () => {
        setSelectAll((prevSelectAll) => !prevSelectAll);
        onSelectedIdsChange((prevSelectedIds: any) => {
            const newSelectedIds = !selectAll
                ? packItemData.map((packDetails: any) => packDetails.id)
                : [];
            return newSelectedIds;
        });
    };
    return (
        <>
            <Box marginBottom={3} >
                <TableContainer component={Paper}>
                    <Table size="small" aria-label="a dense table">
                        <TableHead>
                            <TableRow
                                sx={{
                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                    background: (theme) => theme.palette.grey[50],
                                }}
                            >
                                <TableCell style={{width:'5%'}}><Checkbox checked={selectAll} onChange={handleSelectAllChange}/></TableCell>
                                <TableCell align='left' sx={{ padding: '8px'}}>Pack Item Details</TableCell>
                            </TableRow>
                        </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={2} align='center'>
                                            <DefaultLoader />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {packItemData.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={2} align='center'>
                                                    No data available.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            packItemData.map((packDetails: any, index: number) => (
                                                <TableRow
                                                    key={packDetails.id}
                                                    sx={{
                                                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        background: (theme) => theme.palette.grey[50]
                                                    }}
                                                >
                                                    <TableCell >
                                                        <Checkbox
                                                            checked={selectedIds?.includes(packDetails.id) || false}
                                                            onChange={() => handleCheckboxChangess(packDetails.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box display="inline-flex">
                                                            {packDetails.label}<ReviewStatus status={packDetails.reviewed} />
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>   
        </>
    )
}

export default PackData;
