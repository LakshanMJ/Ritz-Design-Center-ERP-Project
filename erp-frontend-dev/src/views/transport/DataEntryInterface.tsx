import RitzTable from "@/components/Ritz/RitzTable";
import { Typography } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";

const DataEntryInterface = () => {

    const columns: ColumnDef<any>[] = [
        {
          accessorKey: 'country',
          header: 'Country',
        },
        {
          accessorKey: 'mode',
          header: 'Mode',
        },
        {
          accessorKey: 'port',
          header: 'Port',
        },
        {
          accessorKey: 'forwarder_details',
          header: 'Forwarder Details',
        },
        {
          accessorKey: 'forwarder_details',
          header: 'Forwarder Details',
        },
        {
          accessorKey: 'vehicle_types',
          header: 'Vehicle Types',
        },
        {
          accessorKey: 'number_of_vehicles',
          header: 'Number of Vehicles',
        },
        {
          accessorKey: 'week',
          header: 'Week',
        },
        {
          accessorKey: 'days',
          header: 'Days',
        },
        {
          accessorKey: 'time',
          header: 'Time',
        },
        {
          accessorKey: 'forwarder_charges',
          header: 'Forwarder Charges',
        },
        {
          accessorKey: 'Port_charges',
          header: 'Port Charges',
        }
      ];
    
    return(
        <>
            <Typography variant='h1'>Data Entry Interface</Typography>

            <RitzTable
                data={'plants'}
                columns={columns}
            />
        </>
)}

export default DataEntryInterface;