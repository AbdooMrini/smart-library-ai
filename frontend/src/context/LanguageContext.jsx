import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const translations = {
  fr: {
    library: "Bibliothèque", ranking: "Classement", adviser: "Conseiller IA", favorites: "Favoris", profile: "Profil",
    login: "Connexion", logout: "Déconnexion", admin: "Admin", read: "Lire en ligne", downloadPdf: "Télécharger en PDF",
    addFavorite: "Ajouter aux favoris", removeFavorite: "Retirer des favoris", average: "moyenne", ratings: "notes",
    yourRating: "Votre note", rateBook: "Notez ce livre", comments: "Avis des lecteurs", community: "Communauté",
    commentPlaceholder: "Partagez votre impression sur ce livre…", publish: "Publier", noComments: "Aucun commentaire pour le moment.",
    translate: "Traduire", delete: "Supprimer", translatedSummary: "Résumé traduit", translating: "Traduction…",
    quiz: "Mon QCM", generateQuiz: "Générer un QCM", regenerate: "Régénérer", validate: "Valider mes réponses",
    weeklyRanking: "Le classement de la semaine", weeklyPoints: "points cette semaine", totalScore: "Score total",
    howWorks: "Chaque bonne réponse à un QCM rapporte 10 points. Le lecteur avec le plus de points cette semaine est premier.",
    myProfile: "Mon profil", editProfile: "Modifier mon profil", name: "Nom", email: "Email", password: "Nouveau mot de passe (facultatif)",
    language: "Langue du site", french: "Français", english: "Anglais", arabic: "Arabe", save: "Enregistrer",
    photo: "Photo de profil", choosePhoto: "Choisir une photo", upload: "Envoyer la photo",
    totalPoints: "points au total", thisWeek: "cette semaine", yourRank: "votre rang",
    myComments: "Mes commentaires", myWishes: "Mes souhaits", rankHistory: "Historique du classement",
    noActivity: "Aucune activité pour le moment.", wishBook: "Souhaiter un livre", bookTitle: "Titre souhaité", author: "Auteur",
    whyBook: "Pourquoi ce livre ?", sendWish: "Envoyer le souhait", status: "Statut",
    searchBooks: "Rechercher un livre…", allCategories: "Toutes les catégories", allLanguages: "Toutes les langues",
    findReading: "Trouvez votre prochaine lecture.", myFavorites: "Mes favoris", loading: "Chargement…",
    chatTitle: "Que voulez-vous lire ?", send: "Envoyer", selection: "Sélection proposée",
    homeBadge: "Lecture augmentée par Mistral AI", homeTitle: "La bibliothèque qui lit avec vous.", homeText: "Explorez les classiques, comprenez-les dans votre langue et progressez avec les QCM.", explore: "Explorer les livres", popular: "Livres populaires", leaders: "Lecteurs en tête",
    languagesLabel: "langues", aiToolsLabel: "résumés & QCM", libraryAccessLabel: "bibliothèque", featuredBook: "À découvrir",
    readerReviews: "Avis lecteurs", ratingsAndComments: "Notes et commentaires", aiAdviserTitle: "Conseiller intelligent", catalogBased: "Basé sur le catalogue",
    unknownAuthor: "Auteur inconnu", reads: "lectures", viewBook: "Voir le livre", exploreTitle: "Explorez sans limites",
    exploreText: "Trouvez rapidement un livre par titre, auteur, langue ou catégorie.", languageTitle: "Lisez dans votre langue",
    languageText: "Profitez d’une interface et de contenus disponibles en français, anglais et arabe.", progressTitle: "Comprenez et progressez",
    progressText: "Utilisez les résumés intelligents et les QCM pour enrichir chaque lecture.", catalog: "Catalogue", viewLibrary: "Voir toute la bibliothèque",
    readingAdviser: "Conseiller de lecture", nextReadingTitle: "Votre prochaine lecture, mieux choisie.",
    nextReadingText: "Décrivez une envie, un thème ou une ambiance. Le conseiller recherche uniquement parmi les livres réellement disponibles dans votre bibliothèque.",
    communityLabel: "Communauté", viewRanking: "Voir le classement", weeklyRankLabel: "cette semaine", weeklyPointsLabel: "Points hebdomadaires",
    emptyRanking: "Le classement apparaîtra après les premiers QCM.", pointsPerAnswer: "par bonne réponse",
  },
  en: {
    library: "Library", ranking: "Ranking", adviser: "AI adviser", favorites: "Favorites", profile: "Profile",
    login: "Sign in", logout: "Sign out", admin: "Admin", read: "Read online", downloadPdf: "Download PDF",
    addFavorite: "Add to favorites", removeFavorite: "Remove from favorites", average: "average", ratings: "ratings",
    yourRating: "Your rating", rateBook: "Rate this book", comments: "Reader reviews", community: "Community",
    commentPlaceholder: "Share your thoughts about this book…", publish: "Publish", noComments: "No comments yet.",
    translate: "Translate", delete: "Delete", translatedSummary: "Translated summary", translating: "Translating…",
    quiz: "My quiz", generateQuiz: "Generate a quiz", regenerate: "Regenerate", validate: "Submit answers",
    weeklyRanking: "This week's ranking", weeklyPoints: "points this week", totalScore: "Total score",
    howWorks: "Each correct quiz answer gives 10 points. The reader with the most weekly points ranks first.",
    myProfile: "My profile", editProfile: "Edit my profile", name: "Name", email: "Email", password: "New password (optional)",
    language: "Website language", french: "French", english: "English", arabic: "Arabic", save: "Save",
    photo: "Profile photo", choosePhoto: "Choose a photo", upload: "Upload photo",
    totalPoints: "total points", thisWeek: "this week", yourRank: "your rank",
    myComments: "My comments", myWishes: "My wishes", rankHistory: "Ranking history",
    noActivity: "No activity yet.", wishBook: "Request a book", bookTitle: "Book title", author: "Author",
    whyBook: "Why this book?", sendWish: "Send request", status: "Status",
    searchBooks: "Search for a book…", allCategories: "All categories", allLanguages: "All languages",
    findReading: "Find your next read.", myFavorites: "My favorites", loading: "Loading…",
    chatTitle: "What would you like to read?", send: "Send", selection: "Suggested books",
    homeBadge: "Reading enhanced by Mistral AI", homeTitle: "The library that reads with you.", homeText: "Explore classics, understand them in your language and improve with quizzes.", explore: "Explore books", popular: "Popular books", leaders: "Top readers",
    languagesLabel: "languages", aiToolsLabel: "summaries & quizzes", libraryAccessLabel: "library", featuredBook: "Featured",
    readerReviews: "Reader reviews", ratingsAndComments: "Ratings and comments", aiAdviserTitle: "Smart adviser", catalogBased: "Based on the catalog",
    unknownAuthor: "Unknown author", reads: "reads", viewBook: "View book", exploreTitle: "Explore without limits",
    exploreText: "Quickly find a book by title, author, language or category.", languageTitle: "Read in your language",
    languageText: "Enjoy an interface and content available in French, English and Arabic.", progressTitle: "Understand and improve",
    progressText: "Use smart summaries and quizzes to enrich every reading experience.", catalog: "Catalog", viewLibrary: "View the full library",
    readingAdviser: "Reading adviser", nextReadingTitle: "Choose your next read with confidence.",
    nextReadingText: "Describe a mood, theme or idea. The adviser searches only among books actually available in your library.",
    communityLabel: "Community", viewRanking: "View ranking", weeklyRankLabel: "this week", weeklyPointsLabel: "Weekly points",
    emptyRanking: "The ranking will appear after the first quizzes.", pointsPerAnswer: "per correct answer",
  },
  ar: {
    library: "المكتبة", ranking: "الترتيب", adviser: "مستشار الذكاء الاصطناعي", favorites: "المفضلة", profile: "الملف الشخصي",
    login: "تسجيل الدخول", logout: "تسجيل الخروج", admin: "الإدارة", read: "اقرأ عبر الإنترنت", downloadPdf: "تحميل PDF",
    addFavorite: "أضف إلى المفضلة", removeFavorite: "إزالة من المفضلة", average: "المتوسط", ratings: "تقييمات",
    yourRating: "تقييمك", rateBook: "قيّم هذا الكتاب", comments: "آراء القراء", community: "المجتمع",
    commentPlaceholder: "شارك رأيك حول هذا الكتاب…", publish: "نشر", noComments: "لا توجد تعليقات بعد.",
    translate: "ترجمة", delete: "حذف", translatedSummary: "الملخص المترجم", translating: "جارٍ الترجمة…",
    quiz: "اختباري", generateQuiz: "إنشاء اختبار", regenerate: "إعادة الإنشاء", validate: "إرسال الإجابات",
    weeklyRanking: "ترتيب هذا الأسبوع", weeklyPoints: "نقاط هذا الأسبوع", totalScore: "المجموع الكلي",
    howWorks: "كل إجابة صحيحة تمنح 10 نقاط. القارئ صاحب أكبر عدد من النقاط الأسبوعية يحتل المركز الأول.",
    myProfile: "ملفي الشخصي", editProfile: "تعديل الملف الشخصي", name: "الاسم", email: "البريد الإلكتروني", password: "كلمة مرور جديدة (اختياري)",
    language: "لغة الموقع", french: "الفرنسية", english: "الإنجليزية", arabic: "العربية", save: "حفظ",
    photo: "الصورة الشخصية", choosePhoto: "اختر صورة", upload: "رفع الصورة",
    totalPoints: "مجموع النقاط", thisWeek: "هذا الأسبوع", yourRank: "ترتيبك",
    myComments: "تعليقاتي", myWishes: "طلباتي", rankHistory: "سجل الترتيب",
    noActivity: "لا يوجد نشاط حتى الآن.", wishBook: "طلب كتاب", bookTitle: "عنوان الكتاب", author: "المؤلف",
    whyBook: "لماذا هذا الكتاب؟", sendWish: "إرسال الطلب", status: "الحالة",
    searchBooks: "ابحث عن كتاب…", allCategories: "كل التصنيفات", allLanguages: "كل اللغات",
    findReading: "ابحث عن قراءتك القادمة.", myFavorites: "مفضلتي", loading: "جارٍ التحميل…",
    chatTitle: "ماذا تريد أن تقرأ؟", send: "إرسال", selection: "الكتب المقترحة",
    homeBadge: "قراءة مدعومة بالذكاء الاصطناعي", homeTitle: "المكتبة التي تقرأ معك.", homeText: "استكشف الكتب الكلاسيكية وافهمها بلغتك وتقدم من خلال الاختبارات.", explore: "استكشف الكتب", popular: "الكتب الشائعة", leaders: "أفضل القراء",
    languagesLabel: "لغات", aiToolsLabel: "ملخصات واختبارات", libraryAccessLabel: "المكتبة", featuredBook: "كتاب مقترح",
    readerReviews: "آراء القراء", ratingsAndComments: "تقييمات وتعليقات", aiAdviserTitle: "مستشار ذكي", catalogBased: "يعتمد على الفهرس",
    unknownAuthor: "مؤلف غير معروف", reads: "قراءة", viewBook: "عرض الكتاب", exploreTitle: "استكشف بلا حدود",
    exploreText: "اعثر بسرعة على كتاب حسب العنوان أو المؤلف أو اللغة أو التصنيف.", languageTitle: "اقرأ بلغتك",
    languageText: "استمتع بواجهة ومحتوى متوفر بالفرنسية والإنجليزية والعربية.", progressTitle: "افهم وتقدم",
    progressText: "استخدم الملخصات الذكية والاختبارات لإثراء كل تجربة قراءة.", catalog: "الفهرس", viewLibrary: "عرض المكتبة كاملة",
    readingAdviser: "مستشار القراءة", nextReadingTitle: "اختر قراءتك القادمة بثقة.",
    nextReadingText: "صف مزاجاً أو موضوعاً أو فكرة، وسيبحث المستشار فقط في الكتب المتوفرة فعلياً داخل المكتبة.",
    communityLabel: "المجتمع", viewRanking: "عرض الترتيب", weeklyRankLabel: "هذا الأسبوع", weeklyPointsLabel: "النقاط الأسبوعية",
    emptyRanking: "سيظهر الترتيب بعد إكمال أول الاختبارات.", pointsPerAnswer: "لكل إجابة صحيحة",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState(() => localStorage.getItem("smart-library-language") || "fr");
  useEffect(() => {
    if (user?.preferred_language) setLanguage(user.preferred_language);
  }, [user?.preferred_language]);
  useEffect(() => {
    localStorage.setItem("smart-library-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key) => translations[language]?.[key] || translations.fr[key] || key, rtl: language === "ar" }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
