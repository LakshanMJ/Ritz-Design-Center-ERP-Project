import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { Box, Button, Card, Grid, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import dayjs from "dayjs"
import Calendar from "./Calendar"
import { useState } from 'react';

const VesselCutOffDatesDetails = () => {
    const [cutoffData, setCutoffData] = useState(
        [
            {
                id:1,
                name: 'China',
                ports:[
                    {
                        id:1,
                        name: 'Shanghai',
                        cut_off_dates : ['2025-02-25','2025-02-26']	
                    },
                    {
                        id:2,
                        name: 'Yingkou',
                        cut_off_dates : ['2025-02-23','2025-02-01']	
                    },
                    {
                        id:3,
                        name: 'Nanjing',
                        cut_off_dates : ['2025-02-3','2025-02-21']	
                    },
                    {
                        id:3,
                        name: 'Nanjing',
                        cut_off_dates : ['2025-02-3','2025-02-21']	
                    },
                    {
                        id:3,
                        name: 'Nanjing',
                        cut_off_dates : ['2025-02-3','2025-02-21']	
                    },
                    {
                        id:3,
                        name: 'Nanjing',
                        cut_off_dates : ['2025-02-3','2025-02-21']	
                    }
                ]
            }
        ]
    );

    const countries = [
        {id:1, name: 'China'},
        {id:2, name: 'India'},
        {id:3, name: 'Indonesia'},
        {id:4, name: 'Thaiwan'},
    ]

    const [dateRange, setDateRange] = useState({
        start_date: null,
        end_date: null
    });

    const [selectedCountry, setSelectedCountry] = useState({});
    // alert(selectedCountry)
    const handleCountryChange = (country: string) => {
        setSelectedCountry(country);
    };

    const handleDateChange = (key: string, newDate: string) => {
        const startDate = dayjs(newDate);
        const endDate = startDate.add(4, 'week').subtract(1, 'day').format('YYYY-MM-DD');

        setDateRange((prev) => ({
            ...prev,
            start_date: newDate,
            end_date: endDate
        }));
    };

    return (
        <>
            <Box>
                <Typography variant="h1" sx={{mb:6, mt:0, marginLeft: '0px'}} >Vessel cut off dates</Typography>
                <Typography variant="h5" sx={{mb:2, mt:2, marginLeft: '0px'}} >Select Country:</Typography>
                <ToggleButtonGroup
                    color="primary"
                    value={selectedCountry}
                    exclusive
                    onChange={(e) => {
                        const target = e.target as HTMLInputElement;
                        handleCountryChange(target?.value);
                    }}
                    aria-label="Platform"
                    style={{
                        marginLeft: '0px',
                        marginBottom: '20px',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: "space-between",
                        gap: '10 px',
                        maxWidth: '40%',
                        flexWrap: 'wrap'
                    }}
                    >
                        {countries.map((country) => (
                            <ToggleButton key={country.id} style={{ marginRight: '10px', minWidth: '100px', height: '3em', border: `1px solid #E0E0E0 `, borderRadius: '5px', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center'}} value={country.name}>{country.name}</ToggleButton>
                        ))}
                </ToggleButtonGroup>
            
                {/* <Box style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
                    <Box>
                        <Typography variant="h5" sx={{mb:2, mt:2, marginLeft: '0px'}} >Select Start Date:</Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                minDate={dayjs()}
                                format='YYYY-MM-DD'
                                // value={dateRange?.start_date}
                                onChange={(newDate: any) => handleDateChange("start_date", dayjs(newDate.$d).format('YYYY-MM-DD'))}
                            />
                        </LocalizationProvider>
                    </Box>
                </Box>  */}
            {selectedCountry && selectedCountry !== null && (
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
                    <Box>
                    <Typography variant="h5" sx={{ mb: 2, mt: 2 }}>Select Start Date:</Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                        minDate={dayjs()}
                        format='YYYY-MM-DD'
                        value={dateRange?.start_date ? dayjs(dateRange.start_date) : null}
                        onChange={(newDate: any) => {
                            if (newDate) {
                            handleDateChange("start_date", dayjs(newDate).format('YYYY-MM-DD'));
                            }
                        }}
                        />
                    </LocalizationProvider>
                    </Box>
                </Box>
            )}

            <Box>
                <Typography variant="h5" sx={{ mb: 2, mt: 2, marginLeft: '0px' }}>
                    Date Range: 
                    {dateRange?.start_date && dateRange?.end_date 
                        ? ` (${dateRange.start_date} - ${dateRange.end_date})` 
                        : ""}
                </Typography>
            </Box>   
                <Card sx={{padding: '20px', marginTop: '20px'}}>
                    <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'left', gap: '20px', flexWrap: 'wrap' }}>
                        {cutoffData.map((country) => (
                            country.ports.map((port) => (
                                <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', gap: '10px', marginBottom: '30px' }}>
                                    <Button
                                        variant="outlined"
                                        style={{
                                            minWidth: '100px',
                                            maxWidth: '200px',
                                            height: '3em',
                                            border: '1px solid #E0E0E0',
                                            borderRadius: '5px',
                                            // flexGrow: 1,
                                            whiteSpace: 'normal',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            textAlign: 'center',
                                            marginRight: '20px'
                                        }}
                                    >
                                    {port.name}
                                    </Button>
                                    <Box sx={{mb:5,marginRight:20}}>
                                        <Calendar dateRange={dateRange} cutOffDates={port.cut_off_dates} />
                                    </Box>
                                </Box>
                            ))
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button
                        // onClick={() => {setTransportDeliveryDateTrackingDataModalOpen(true)}}
                            variant="contained"
                            color="primary"
                            sx={{ marginRight: '10px' }}
                        >
                            Select
                        </Button>
                    </Box>
                </Card>
            </Box>
        </>
    )
}

export default VesselCutOffDatesDetails