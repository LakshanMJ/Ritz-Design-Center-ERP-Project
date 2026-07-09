import RitzInput from "@/components/Ritz/RitzInput";
import { Box, darken, IconButton, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from "@mui/material";
import React from "react";
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

const CadRatioBreakDown = ({ order }: any) => {
//dummy for first
    // const dummyPayload = [
    //     {
    //         country: 'US',
    //         item: 'Baby-SS Body Suit',
    //         colorway: 'cw1',
    //         placement: 'Body Fabric',
    //         individual_sizes_ratio: [
    //             {
    //                 name: 'Extra Small',
    //                 id: 1,
    //                 consumption: 0.11,
    //                 wastage: 0.22,
    //             },
    //             {
    //                 name: 'Small',
    //                 id: 2,
    //                 consumption: 0.33,
    //                 wastage: 0.33,
    //             },
    //         ],
    //         group_sizes_ratio: [
    //             {
    //                 sizes: [{ name: 'Extra Small', id: 1 }, { name: 'Small', id: 2 }],
    //                 id: 1,
    //                 consumption: 0.66,
    //                 wastage: 0.66,
    //             }
    //         ],

    //     }
    // ]
//dummy for secound colounm
    // const dummyPayload = [
    //     {
    //         country: 'US',
    //         item: 'Baby-SS Body Suit',
    //         colorway: 'cw1',
    //         placement: 'Body Fabric',
    //         individual_sizes_ratio: [
    //             {
    //                 name: 'Extra Small',
    //                 id: 1,
    //                 consumption: 0.11,
    //                 wastage: 0.22,
    //             },
    //             {
    //                 name: 'Small',
    //                 id: 2,
    //                 consumption: 0.33,
    //                 wastage: 0.33,
    //             },
    //             {
    //                 name: 'Medium',
    //                 id: 3,
    //                 consumption: 0.44,
    //                 wastage: 0.44,
    //             },
    //             {
    //                 name: 'Large',
    //                 id: 4,
    //                 consumption: 0.55,
    //                 wastage: 0.55,
    //             },
    //         ],
    //         group_sizes_ratio: [
    //             {
    //                 sizes: [{ name: 'Extra Small', id: 1 }, { name: 'Small', id: 2 }],
    //                 id: 1,
    //                 consumption: 0.66,
    //                 wastage: 0.66,
    //             },
    //             {
    //                 sizes: [{ name: 'Medium', id: 3 }, { name: 'Large', id: 4 }],
    //                 id: 2,
    //                 consumption: 0.77,
    //                 wastage: 0.77,
    //             },
    //         ],

    //     }
    // ]
//dummy for third colounm
    const dummyPayload = [
        {
            country: 'US',
            item: 'Baby-SS Body Suit',
            colorway: 'cw1',
            placement: 'Body Fabric',
            individual_sizes_ratio: [
                {
                    name: 'Extra Small',
                    id: 1,
                    consumption: 0.11,
                    wastage: 0.22,
                },
                {
                    name: 'Small',
                    id: 2,
                    consumption: 0.33,
                    wastage: 0.33,
                },
                {
                    name: 'Medium',
                    id: 3,
                    consumption: 0.44,
                    wastage: 0.44,
                },
                {
                    name: 'Large',
                    id: 4,
                    consumption: 0.55,
                    wastage: 0.55,
                },
            ],
            group_sizes_ratio: [
                {
                    sizes: [{ name: 'Extra Small', id: 1 }, { name: 'Small', id: 2 }],
                    id: 1,
                    consumption: 0.66,
                    wastage: 0.66,
                },
                {
                    sizes: [{ name: 'Medium', id: 3 }, { name: 'Large', id: 4 }],
                    id: 2,
                    consumption: 0.77,
                    wastage: 0.77,
                },
            ],

        },
        {
            country: 'US',
            item: 'Baby-SS Body Suit',
            colorway: 'cw2',
            placement: 'Body Fabric',
            individual_sizes_ratio: [
                {
                    name: 'Extra Small',
                    id: 1,
                    consumption: 0.88,
                    wastage: 0.88,
                },
                {
                    name: 'Small',
                    id: 2,
                    consumption: 0.99,
                    wastage: 0.99,
                },
                {
                    name: 'Medium',
                    id: 3,
                    consumption: 1,
                    wastage: 1,
                },
                {
                    name: 'Large',
                    id: 4,
                    consumption: 2,
                    wastage: 2,
                },
            ],
            group_sizes_ratio: [
                {
                    sizes: [{ name: 'Extra Small', id: 1 }, { name: 'Small', id: 2 }],
                    id: 1,
                    consumption: 4,
                    wastage: 4,
                },
                {
                    sizes: [{ name: 'Medium', id: 3 }, { name: 'Large', id: 4 }],
                    id: 1,
                    consumption: 5,
                    wastage: 5,
                },
            ],

        },
    ]

    return (
       <Box>
        <TableContainer>
            {dummyPayload.map((item, itemIndex) => (
                <Table key={itemIndex}>
                    <TableHead>
                        <TableRow>
                            <TableCell colSpan={item.individual_sizes_ratio.length} align='left' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                {`${item.country}-${item.item}-${item.colorway}-${item.placement}`}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            {item.individual_sizes_ratio.map((size, sizeIndex) => (
                                <TableCell align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }} key={`${itemIndex}-${sizeIndex}-sizename`}>{size.name}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            {item.individual_sizes_ratio.map((size, sizeIndex) => (
                                <TableCell align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}  key={`${itemIndex}-${sizeIndex}-ratios`}>
                                    <Box sx={{ mb: 2 }}>
                                        <InputLabel htmlFor={`consumption`}>Consumption</InputLabel>
                                        <InputLabel>{size.consumption}</InputLabel>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                        <InputLabel htmlFor={`wastage`}>Wastage</InputLabel>
                                        <InputLabel>{size.wastage}</InputLabel>
                                    </Box>
                                </TableCell>

                            ))}
                        </TableRow>
                        <TableRow>
                            {item.group_sizes_ratio.map((group, groupIndex) => {
                                let groupsizename = '';
                                group.sizes.map((sizearray, arrayindex) => {
                                    groupsizename += sizearray.name;
                                    if (arrayindex < group.sizes.length - 1) {
                                        groupsizename += ' - ';
                                    }
                                });
                                return (
                                    <TableCell
                                        key={groupIndex}
                                        colSpan={group.sizes.length}
                                        align='center'
                                        sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                    >
                                        <b>{groupsizename}</b>

                                    </TableCell>
                                );
                            })}
                        </TableRow>
                        <TableRow>
                            {item.group_sizes_ratio.map((group, groupIndex) => (
                                <TableCell key={groupIndex} colSpan={group.sizes.length} align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                    <Box sx={{ mb: 2 }}>
                                        <InputLabel htmlFor={`consumption`}>Consumption</InputLabel>
                                        <InputLabel>{group.consumption}</InputLabel>
                                    </Box>
                                    <Box sx={{ mb: 2 }}>
                                        <InputLabel htmlFor={`wastage`}>Wastage</InputLabel>
                                        <InputLabel>{group.wastage}</InputLabel>
                                    </Box>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableBody>
                </Table>
            ))}
        </TableContainer>
    </Box>
    )
};

export default CadRatioBreakDown;
