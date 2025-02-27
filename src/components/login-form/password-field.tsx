import { ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, InputAdornment, Tooltip } from '@mui/material';

import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

import LoginField, { LoginFieldProps } from './login-field';

interface State {
  showPassword: boolean;
}

export default function PasswordField(props: LoginFieldProps): ReactElement {
  const { t } = useTranslation();

  const [state, setState] = useState<State>({
    showPassword: false,
  });

  const handleClickShowPassword = (): void => {
    setState((state) => ({ ...state, showPassword: !state.showPassword }));
  };

  const handleMouseDownPassword: React.MouseEventHandler<HTMLButtonElement> = (
    event
  ) => {
    event.preventDefault();
  };

  return (
    <LoginField
      {...props}
      type={state.showPassword ? 'text' : 'password'}
      autoComplete="off"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip
              title={
                state.showPassword
                  ? t('login-form.hide-password') ?? ''
                  : t('login-form.show-password') ?? ''
              }
            >
              <IconButton
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
              >
                {state.showPassword ? (
                  <VisibilityOffIcon />
                ) : (
                  <VisibilityIcon />
                )}
              </IconButton>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}
