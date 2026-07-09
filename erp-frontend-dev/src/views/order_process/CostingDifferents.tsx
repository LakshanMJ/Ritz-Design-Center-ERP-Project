import React, { useState } from "react";
import DefaultLoader from "../../components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

const CostingDifferents = () => {
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Change Summary</TableCell>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>VER000252</TableCell>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>VER000136</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Change Material (CB001087-RSJCSNS40160-002-MIDBLUE)</TableCell >
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>2.2</TableCell >
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>3.2</TableCell >
                </TableRow>
                <TableRow>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Mateiral Placement Removed (Elastic)</TableCell >
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>2</TableCell >
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>1</TableCell >
                </TableRow>
              </TableBody>
            </Table>
        </>
      )}
    </>
  );
};

export default CostingDifferents;