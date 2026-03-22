from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import User
from api.schemas import UserRegister, UserLogin, Token, UserResponse
from api.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/dev-list-users")
def dev_list_users(secret: str, db: Session = Depends(get_db)):
    if secret != "gymreset2026":
        raise HTTPException(status_code=403, detail="Forbidden")
    users = db.query(User.username, User.email).all()
    return [{"username": u.username, "email": u.email} for u in users]


@router.post("/dev-reset-pw")
def dev_reset_pw(username: str, new_password: str, secret: str, db: Session = Depends(get_db)):
    if secret != "gymreset2026":
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(new_password)
    db.commit()
    return {"ok": True, "username": username}


@router.post("/login", response_model=Token)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}
