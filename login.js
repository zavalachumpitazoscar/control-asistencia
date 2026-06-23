import { signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const auth = getAuth(app);

window.login = async function () {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        alert("Login correcto");

        window.location.href = "empresa.html?id=XXXX";

    } catch (error) {
        alert("Error de login");
        console.error(error);
    }
};
