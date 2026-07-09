import { Alert, Typography } from '@mui/material';

const ErrorMessages = ({message}: any) => (
    (Array.isArray(message) && message?.length > 1) ? (
        <ul style={{ paddingLeft: '1rem', marginTop: 0, marginBottom: 0 }}>
            {message.map((error: any, index: number) => (
                <li key={index}>
                    {error}
                </li>
            ))}
        </ul>
    ) : (
        <>{message}</>
    )
)

const FormErrorMessage = ({message, type='text', alertSeverity='error', sx={}} : any) => (
    <>
        {type === 'alert' && 
            <Alert severity={alertSeverity} icon={false} sx={sx}>
                <ErrorMessages message={message} />
            </Alert>
        }

        {type == 'text' && 
            <Typography
                sx={{
                    color: (theme) => theme.palette.error.main,
                    fontSize: 'small',
                    mt: 0.5
                }}
            >
                <ErrorMessages message={message} />
            </Typography>
        }
    </>
)

export default FormErrorMessage;