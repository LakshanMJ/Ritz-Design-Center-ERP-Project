import RitzSelection from '@/components/Ritz/RitzSelection';
import { Alert, Autocomplete, Box, Button, Checkbox, InputLabel, TextField, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react'
import * as restUrls from '../../helpers/constants/RestUrls';
import * as yup from "yup";
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from '@/components/SaveSpinner';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from '@/components/Ritz/RitzTable';
import { toast } from 'react-hot-toast';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import FormErrorMessage from '@/components/FormErrorMessage';
import { getDefaultError } from '@/helpers/Utilities';
import CreatableSelect from 'react-select/creatable';
import RitzInput from '@/components/Ritz/RitzInput';


const EmbellishmentDetail = () => {
  
    return (
        <>
            Need TO set EMb Details
        </>
    )
}

export default EmbellishmentDetail;