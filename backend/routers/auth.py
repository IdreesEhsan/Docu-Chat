from fastapi import APIRouter, HTTPException
from models.schemas import UserRegister, UserLogin, OTPVerify
from services.db_service import supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register_user(request: UserRegister):
    """Register a new user. Returns user ID. Email confirmation required."""
    try:
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "name": request.name,
                    "age": request.age,
                    "country": request.country
                }
            }
        })
        return {
            "message": "Registration successful. Check email for OTP.",
            "user_id": response.user.id if response.user else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
async def verify_otp(request: OTPVerify):
    """Verify the OTP and return JWT access token."""
    try:
        response = supabase.auth.verify_otp({
            "email": request.email,
            "token": request.otp,
            "type": "signup"
        })
        return {
            "message": "Email verified successfully!",
            "access_token": response.session.access_token
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP." + str(e))

@router.post("/login")
async def login_user(request: UserLogin):
    """Login with email/password, return JWT."""
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        return {
            "access_token": response.session.access_token,
            "user": response.user.user_metadata
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password.")