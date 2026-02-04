import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface CursorIconProps {
  /** Size of the icon (width and height) */
  size?: number;
  /** Hex or RGBA color of the icon */
  color?: string;
  /** Optional style for the SVG container */
  style?: object;
}

const CursorIcon: React.FC<CursorIconProps> = ({ 
  size = 24, 
  color = "#0D0D0D", 
  style 
}) => {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      style={style}
    >
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.80294 13.1729L19.5621 19.3015C20.6845 19.738 21.7206 18.5012 21.0942 17.4726L18.1597 12.6542C17.9146 12.2519 17.9146 11.7464 18.1597 11.3441L21.0942 6.52569C21.7206 5.4971 20.6845 4.26033 19.5621 4.69684L3.80294 10.8254C2.73235 11.2417 2.73236 12.7566 3.80294 13.1729ZM6.85028 12.237C8.03601 12.6854 16.203 15.6601 17.7885 16.2374C17.8774 16.2698 17.9548 16.171 17.9053 16.0903L16.0386 13.0408C15.6469 12.401 15.6462 11.5957 16.0368 10.9552L17.9049 7.89232C17.9542 7.81155 17.8771 7.71278 17.7882 7.74524C16.2225 8.31706 8.21645 11.2417 6.87028 11.7501C6.44036 11.915 6.4426 12.0774 6.85028 12.237Z"
        fill={color}
      />
    </Svg>
  );
};

export default CursorIcon;